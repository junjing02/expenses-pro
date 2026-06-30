import { createWorker } from 'tesseract.js';

/**
 * Perform Client-side OCR on an image file and parse key receipt values.
 * Runs entirely in-browser to eliminate custom server costs.
 * 
 * @param {File | string} imageFile - The file object or URL of the receipt image.
 * @param {Function} onProgress - Optional callback to track OCR progress.
 * @returns {Promise<{
 *   success: boolean,
 *   text: string,
 *   parsedData: {
 *     vendor: string,
 *     date: string,
 *     totalAmount: number,
 *     lineItems: Array<{ item_name: string, quantity: number, unit_price: number, total_price: number }>
 *   }
 * }>}
 */
export async function processReceiptOCR(imageFile, onProgress = null) {
  let worker = null;
  try {
    // 1. Initialize Tesseract Worker
    worker = await createWorker('eng');
    
    // Set up progress logger
    if (onProgress) {
      // Tesseract worker logger logs object: { status: 'recognizing text', progress: 0.45 }
      // We pass the percentage back
      worker.logger = (m) => {
        if (m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100));
        }
      };
    }

    // 2. Run OCR Text Extraction
    const ret = await worker.recognize(imageFile);
    const text = ret.data.text;

    // 3. Clean up the worker
    await worker.terminate();

    // 4. Parse Extracted Text
    const parsedData = parseReceiptText(text);

    return {
      success: true,
      text,
      parsedData
    };
  } catch (error) {
    console.error("OCR Processing failed: ", error);
    if (worker) {
      try { await worker.terminate(); } catch (e) { /* ignore */ }
    }
    return {
      success: false,
      text: '',
      error: error.message,
      parsedData: {
        vendor: '',
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0.00,
        lineItems: []
      }
    };
  }
}

/**
 * Parsing heuristics for raw receipt text.
 * Parses:
 *  - Vendor: Matches first few non-blank lines, skipping numbers/headers.
 *  - Date: Searches for MM/DD/YYYY, YYYY-MM-DD or MM-DD-YY style strings.
 *  - Total Amount: Extracts standard money patterns near terms like "TOTAL", "AMOUNT DUE", "NET".
 *  - Line Items: Scans lines with items and numbers/price formats to generate items breakdowns.
 */
function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let vendor = 'Unknown Vendor';
  let date = new Date().toISOString().split('T')[0]; // Default to today
  let totalAmount = 0.00;
  const lineItems = [];

  // --- 1. DETECT VENDOR ---
  // Heuristic: The first non-empty line of the receipt is usually the store/vendor name.
  // Skip lines containing common header words like "RECEIPT", "INVOICE", "WELCOME", or pure numbers.
  const vendorSkips = /receipt|invoice|welcome|date|phone|tel:|tax|cashier|transaction/i;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (!vendorSkips.test(line) && !/^\d+$/.test(line) && line.length > 2) {
      vendor = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim(); // Sanitize special OCR noise
      break;
    }
  }

  // --- 2. DETECT DATE ---
  // Look for formats: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.
  const dateRegex = /\b(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})\b/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      let [_, p1, p2, p3] = match;
      // Convert to YYYY-MM-DD format
      if (p1.length === 4) {
        // YYYY-MM-DD
        date = `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      } else if (p3.length === 4) {
        // MM/DD/YYYY or DD/MM/YYYY. Standardize to YYYY-MM-DD (assume US style MM/DD/YYYY for heuristics)
        date = `${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
      } else if (p3.length === 2) {
        // MM/DD/YY -> 20YY-MM-DD
        date = `20${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
      }
      break; // Stop at first valid-looking date
    }
  }

  // --- 3. DETECT TOTAL AMOUNT ---
  // Terms that precede the total invoice amount
  const totalKeywords = /(?:total|grand\s+total|amount\s+due|subtotal|balance|net\s+pay|cash|visa|mastercard|total\s+due)/i;
  const priceRegex = /\$?(\d{1,5}\.\d{2})\b/;
  
  let candidates = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (totalKeywords.test(line)) {
      const match = line.match(priceRegex);
      if (match) {
        candidates.push({
          amount: parseFloat(match[1]),
          priority: line.toLowerCase().includes('grand') || line.toLowerCase().includes('amount due') ? 3 : 2
        });
      } else if (i + 1 < lines.length) {
        // Sometimes the total value is on the next line
        const nextLineMatch = lines[i + 1].match(priceRegex);
        if (nextLineMatch) {
          candidates.push({
            amount: parseFloat(nextLineMatch[1]),
            priority: 1
          });
        }
      }
    }
  }

  // Sort candidates by priority, then by value (usually total is the highest value in candidates)
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.priority - a.priority || b.amount - a.amount);
    totalAmount = candidates[0].amount;
  } else {
    // Fallback: search for any price-like decimals in the entire document and pick the highest one
    let highestPrice = 0;
    for (const line of lines) {
      const match = line.match(priceRegex);
      if (match) {
        const val = parseFloat(match[1]);
        if (val > highestPrice && val < 50000) { // Limit sanity check
          highestPrice = val;
        }
      }
    }
    totalAmount = highestPrice;
  }

  // --- 4. DETECT LINE ITEMS ---
  // Heuristic: Search for lines containing an item descriptor followed by quantities and prices.
  // We use 3 regex formats to maximize extraction rate:
  // Format A: "Item Name Qty Price" or "Item Name Price" (handles Chinese characters too)
  const formatARegex = /^([a-zA-Z\s\-\u4e00-\u9fa5]+?)\s+(?:(?:x\s*|qty\s*)?(\d+)\s+)?\$?\s*(\d+\.\d{2})$/;
  // Format B: "Qty Item Name Price" (e.g. "2 Organic Bananas $1.99")
  const formatBRegex = /^(?:(\d+)(?:x|qty)?\s+)?([a-zA-Z\s\-\u4e00-\u9fa5]+?)\s+\$?\s*(\d+\.\d{2})$/;
  // Format C: "Item Name Qty @ Price" (e.g. "Coca Cola 2 @ 1.50")
  const formatCRegex = /^([a-zA-Z\s\-\u4e00-\u9fa5]+?)\s+(\d+)\s*(?:@|at)\s*\$?\s*(\d+\.\d{2})$/;
  
  for (const line of lines) {
    // Avoid processing headers, totals, or dates as line items
    if (totalKeywords.test(line) || dateRegex.test(line) || line.toLowerCase().includes('tax') || line.toLowerCase().includes('change') || line.toLowerCase().includes('subtotal') || line.toLowerCase().includes('balance')) {
      continue;
    }

    let match = line.match(formatCRegex);
    if (match) {
      const item_name = match[1].trim();
      const quantity = parseInt(match[2], 10);
      const unit_price = parseFloat(match[3]);
      const total_price = parseFloat((quantity * unit_price).toFixed(2));
      if (item_name.length > 2 && total_price > 0 && total_price <= (totalAmount || 10000)) {
        lineItems.push({ item_name, quantity, unit_price, total_price });
        continue;
      }
    }

    match = line.match(formatARegex);
    if (match) {
      const item_name = match[1].trim();
      const quantity = match[2] ? parseInt(match[2], 10) : 1;
      const total_price = parseFloat(match[3]);
      const unit_price = parseFloat((total_price / quantity).toFixed(2));
      if (item_name.length > 2 && total_price > 0 && total_price <= (totalAmount || 10000)) {
        lineItems.push({ item_name, quantity, unit_price, total_price });
        continue;
      }
    }

    match = line.match(formatBRegex);
    if (match) {
      const quantity = match[1] ? parseInt(match[1], 10) : 1;
      const item_name = match[2].trim();
      const total_price = parseFloat(match[3]);
      const unit_price = parseFloat((total_price / quantity).toFixed(2));
      if (item_name.length > 2 && total_price > 0 && total_price <= (totalAmount || 10000)) {
        lineItems.push({ item_name, quantity, unit_price, total_price });
        continue;
      }
    }
  }

  // If we couldn't parse specific line items, generate one placeholder matching the vendor total
  if (lineItems.length === 0 && totalAmount > 0) {
    lineItems.push({
      item_name: `Receipt Item (${vendor})`,
      quantity: 1,
      unit_price: totalAmount,
      total_price: totalAmount
    });
  }

  return {
    vendor,
    date,
    totalAmount,
    lineItems
  };
}
