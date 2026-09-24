import http from 'http';
import { createClient } from '@supabase/supabase-js';

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- STARTING REVIEW SECTION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Fetch home page and check if review section HTML is present
  console.log('\n1. Testing Homepage Reviews Section HTML Delivery:');
  const res = await fetchPage('http://localhost:8080/');
  assert(res.statusCode === 200, 'Homepage returns HTTP 200');
  assert(res.body.includes('id="reviews-section"'), 'Review section container (#reviews-section) exists in DOM');
  assert(res.body.includes('What Our Customers Say'), 'Headline "What Our Customers Say" is present');
  assert(res.body.includes('Vijay Sir'), 'Vijay Sir reference in reviews headline is present');
  assert(res.body.includes('4.8'), 'Average rating 4.8 is displayed');
  assert(res.body.includes('240+ Local Ratings') || res.body.includes('240+'), '240+ ratings badge is displayed');
  assert(res.body.includes('Write a Review'), '"Write a Review" CTA button is present');

  // Test 2: Check review cards content
  console.log('\n2. Testing Review Content & Verified Customers:');
  assert(res.body.includes('Rahul Deshmukh'), 'Customer Rahul Deshmukh review is present');
  assert(res.body.includes('Pooja Shinde'), 'Customer Pooja Shinde review is present');
  assert(res.body.includes('Amit Kulkarni'), 'Customer Amit Kulkarni review is present');
  assert(res.body.includes('Sachin More'), 'Customer Sachin More review is present');
  assert(res.body.includes('Sneha Patil'), 'Customer Sneha Patil review is present');
  assert(res.body.includes('Ganesh Jagtap'), 'Customer Ganesh Jagtap review is present');

  // Test 3: Check category tabs & devices
  console.log('\n3. Testing Category Filter Tabs & Tags:');
  assert(res.body.includes('Smartphones'), 'Smartphones category is present');
  assert(res.body.includes('30-Min Repairs') || res.body.includes('Repair &amp; Screen') || res.body.includes('Repair & Screen'), 'Repair category is present');
  assert(res.body.includes('Certified Refurbished'), 'Refurbished category is present');
  assert(res.body.includes('Zero-Down EMI') || res.body.includes('0-Down EMI'), 'Zero-Down EMI category is present');

  // Test 4: Footer quick link
  console.log('\n4. Testing Footer Navigation Link:');
  assert(res.body.includes('#reviews-section'), 'Site footer includes direct anchor link to #reviews-section');

  // Test 5: End-to-end Supabase review insertion via anonymous client
  console.log('\n5. Testing Supabase Review Form Submission (E2E):');
  const sb = createClient(
    'https://egzcesgamwghmddxnent.supabase.co',
    'sb_publishable_TlkAKqE1YolICBKvRYs2FA_pIaHSTs2'
  );

  const testReview = {
    customer_name: 'Test Reviewer Talegaon',
    rating: 5,
    review_text: '[Device/Service: iPhone 15 Pro Display] Excellent same-day repair service by Vijay Sir!',
    source: 'website',
    is_featured: false,
  };

  const { error: insertErr } = await sb.from('reviews').insert(testReview);
  assert(!insertErr, 'Review successfully submitted to Supabase database without RLS violations');

  console.log(`\n--- TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ---`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
