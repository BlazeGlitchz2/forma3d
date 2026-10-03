import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,generateId,generateToken} from '../lib/auth.ts';
import {getFallbackSupportReply} from '../lib/support-fallback.ts';
import {generateSupportChatReply} from '../lib/ai-support.ts';

test('Password hashing produces distinct salts and validates correctly', () => {
  const p1 = 'SecretPassword123!';
  const h1 = hashPassword(p1);
  const h2 = hashPassword(p1);

  // Different salts produce different hashes
  assert.notEqual(h1, h2);
  assert.ok(verifyPassword(p1, h1));
  assert.ok(verifyPassword(p1, h2));
  assert.equal(verifyPassword('WrongPassword', h1), false);
  assert.equal(verifyPassword('', h1), false);
  assert.equal(verifyPassword(p1, 'corrupt:hash'), false);
});

test('Session IDs and tokens have expected format', () => {
  const userId = generateId('usr');
  assert.match(userId, /^usr_[a-f0-9]{24}$/);

  const token = generateToken();
  assert.match(token, /^[a-f0-9]{64}$/);
});

test('Support Fallback provides rich bilingual knowledge base for Forma3D', () => {
  // English printer specs
  const printerEn = getFallbackSupportReply('What is the maximum print size of the printer?', 'en');
  assert.match(printerEn.text, /Creality Ender-3 V3 SE/i);
  assert.match(printerEn.text, /220 × 220 × 250 mm/);

  // Arabic printer specs
  const printerAr = getFallbackSupportReply('ما هي أبعاد طابعة اندر؟', 'ar');
  assert.match(printerAr.text, /Creality Ender-3 V3 SE/);
  assert.match(printerAr.text, /٢٢٠ × ٢٢٠ × ٢٥٠|220 × 220 × 250/);

  // Pricing
  const priceEn = getFallbackSupportReply('How much does it cost to print?', 'en');
  assert.match(priceEn.text, /SAR 25/);
  assert.match(priceEn.text, /before printing/i);
  assert.match(priceEn.text, /Free/i); // pickup

  const priceAr = getFallbackSupportReply('كم سعر وتكلفة الطباعة والتوصيل؟', 'ar');
  assert.match(priceAr.text, /25 ريال/);
  assert.match(priceAr.text, /15 ريال/);
  assert.match(priceAr.text, /مجاني/);

  // Materials & Colors
  const matEn = getFallbackSupportReply('What colors of PLA do you have?', 'en');
  assert.match(matEn.text, /PLA/);
  assert.match(matEn.text, /Cloud White/i);
  assert.match(matEn.text, /Coral Red/i);

  const matAr = getFallbackSupportReply('ما هي ألوان الفيلامينت المتوفرة؟', 'ar');
  assert.match(matAr.text, /PLA/);
  assert.match(matAr.text, /السحابي/);
  assert.match(matAr.text, /المرجاني/);

  // Jubail Pickup & Delivery
  const locEn = getFallbackSupportReply('Where are you located in Jubail?', 'en');
  assert.match(locEn.text, /Jubail/i);
  assert.match(locEn.text, /Alhussan International School/);
  assert.match(locEn.text, /staff verifies full payment/i);

  const locAr = getFallbackSupportReply('وين موقعكم في الجبيل وهل في توصيل؟', 'ar');
  assert.match(locAr.text, /الجبيل/);
  assert.match(locAr.text, /الحصان العالمية/);
  assert.match(locAr.text, /تأكيد الفريق للدفع كاملًا/);

  // Order tracking with JBL code
  const trackEn = getFallbackSupportReply('Can you track my order JBL-9A8B7C6D?', 'en');
  assert.match(trackEn.text, /JBL-9A8B7C6D/);
  assert.match(trackEn.text, /\/track/);

  const trackAr = getFallbackSupportReply('أبي أتبع طلبي JBL-12345678', 'ar');
  assert.match(trackAr.text, /JBL-12345678/);
  assert.match(trackAr.text, /\/track/);

  // File formats
  const fileEn = getFallbackSupportReply('Can I upload STL or 3MF files?', 'en');
  assert.match(fileEn.text, /STL/);
  assert.match(fileEn.text, /3MF/);
  assert.match(fileEn.text, /15 MB/i);

  // Human / Ticket
  const ticketEn = getFallbackSupportReply('I want to speak with a human or submit a ticket', 'en');
  assert.match(ticketEn.text, /ticket/i);
});

test('Chat engine falls back seamlessly to knowledge base when no API key is set', async () => {
  const reply = await generateSupportChatReply('Tell me about your 3D printing in Jubail', [], 'en');
  assert.ok(reply.message.length > 50);
  assert.equal(reply.fallbackUsed, true);
  assert.ok(reply.suggestions && reply.suggestions.length > 0);
  assert.match(reply.message, /Ender-3 V3 SE|Forma3D|Jubail/i);
});
