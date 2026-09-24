<?php
// Regenerates src/lib/payments/fixtures.json with PayFast's official PHP SDK (github.com/Payfast/payfast-php-sdk):
//   git clone https://github.com/Payfast/payfast-php-sdk /tmp/pfsdk && cd /tmp/pfsdk && php <repo>/scripts/payfast-fixtures.php > <repo>/src/lib/payments/fixtures.json
// Merchant 10000100 and passphrase jt7NOE43FZPn are PayFast's published sandbox test values (SDK README), not secrets.
require 'lib/Exceptions/InvalidRequestException.php';
require 'lib/PayFastBase.php';
require 'lib/PayFastPayment.php';
require 'lib/Auth.php';
require 'lib/PaymentIntegrations/Notification.php';
use PayFast\Auth;
use PayFast\PaymentIntegrations\Notification;

// Synthetic values only.
$checkout = [
  'merchant_id' => '10000100', 'merchant_key' => '46f0cd694581a',
  'return_url' => 'https://app.example.test/app/join/return',
  'cancel_url' => 'https://app.example.test/app/join/cancel',
  'notify_url' => 'https://app.example.test/api/payfast/notify',
  'email_address' => 'sam+pilot@example.test',
  'm_payment_id' => '6f1c2d3e-0000-4000-8000-000000000001',
  'amount' => '10.00',
  'item_name' => "The Ledger Loft founding pilot (90 days) – R10 & more ~*'!",
];
$out = ['checkout' => []];
foreach (['' , 'jt7NOE43FZPn'] as $pp) {
  $out['checkout'][] = ['data' => $checkout, 'passphrase' => $pp, 'signature' => Auth::generateSignature($checkout, $pp === '' ? null : $pp)];
}
// ITN: sign like PayFast would (param string of fields in order, then passphrase), then check with the SDK's own methods.
$itn = [
  'm_payment_id' => '6f1c2d3e-0000-4000-8000-000000000001', 'pf_payment_id' => '1089250',
  'payment_status' => 'COMPLETE', 'item_name' => "Founding pilot – R10 & more ~*'!", 'item_description' => '',
  'amount_gross' => '10.00', 'amount_fee' => '-0.23', 'amount_net' => '9.77',
  'custom_str1' => '', 'name_first' => 'Test', 'name_last' => "O'Brien", 'email_address' => 'sam+pilot@example.test',
  'merchant_id' => '10000100',
];
$n = new Notification();
$r = new ReflectionClass($n);
$toString = $r->getMethod('dataToString'); $toString->setAccessible(true);
$valid = $r->getMethod('pfValidSignature'); $valid->setAccessible(true);
$out['itn'] = [];
foreach (['', 'jt7NOE43FZPn'] as $pp) {
  $param = $toString->invoke($n, $itn);
  $sig = md5($pp === '' ? $param : $param . '&passphrase=' . urlencode($pp));
  $posted = $itn + ['signature' => $sig];
  $body = http_build_query($posted);
  $out['itn'][] = ['body' => $body, 'passphrase' => $pp, 'paramString' => $param, 'sdkValid' => $valid->invoke($n, $posted, $param, $pp)];
}
echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), "\n";
