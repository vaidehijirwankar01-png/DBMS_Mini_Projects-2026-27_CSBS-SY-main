const mongoose = require('mongoose');
const M = require('./models');
const d = s => new Date(s);
(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_management');
  for (const m of Object.values(M)) await m.deleteMany({});
  const [f1, f2, f3] = await M.farmers.insertMany([
    { first_name: 'Ramesh', last_name: 'Patil', gender: 'Male', date_of_birth: d('1980-04-12'), phone: '9890011223', address: 'Mulshi, Pune', aadhaar_no: '1234-5678-9012' },
    { first_name: 'Sunita', last_name: 'Jadhav', gender: 'Female', date_of_birth: d('1985-09-23'), phone: '9822334455', address: 'Baramati', aadhaar_no: '2345-6789-0123' },
    { first_name: 'Anil', last_name: 'More', gender: 'Male', date_of_birth: d('1975-01-05'), phone: '9765432109', address: 'Satara', aadhaar_no: '3456-7890-1234' }]);
  await M.farmer_profiles.insertMany([
    { farmer: f1._id, farm_size: 8, experience_years: 20, education: 'HSC', bank_account: 'SBI-0012345', bio: 'Sugarcane grower' },
    { farmer: f2._id, farm_size: 5, experience_years: 12, education: 'Graduate', bank_account: 'BOM-0098765', bio: 'Vegetable farmer' }]);
  const [l1, l2, l3] = await M.lands.insertMany([
    { farmer: f1._id, area: 5, soil_type: 'Black', location: 'Mulshi', irrigation_type: 'Canal', ownership_type: 'Owned' },
    { farmer: f1._id, area: 3, soil_type: 'Red', location: 'Paud', irrigation_type: 'Drip', ownership_type: 'Leased' },
    { farmer: f2._id, area: 5, soil_type: 'Loamy', location: 'Baramati', irrigation_type: 'Sprinkler', ownership_type: 'Owned' }]);
  await M.soil_tests.insertMany([
    { land: l1._id, test_date: d('2026-05-10'), ph_value: 7.2, nitrogen: 220, phosphorus: 18, potassium: 190, organic_carbon: 0.7 },
    { land: l3._id, test_date: d('2026-05-15'), ph_value: 6.8, nitrogen: 250, phosphorus: 22, potassium: 210, organic_carbon: 0.9 }]);
  const [kharif, rabi] = await M.seasons.insertMany([
    { season_name: 'Kharif', start_date: d('2026-06-01'), end_date: d('2026-10-31'), region: 'Maharashtra' },
    { season_name: 'Rabi', start_date: d('2026-11-01'), end_date: d('2027-03-31'), region: 'Maharashtra' }]);
  const [wheat, soy, tomato] = await M.crops.insertMany([
    { crop_name: 'Wheat', category: 'Cereal', duration_days: 120, expected_yield: 40, market_price: 2200, description: 'Rabi cereal', season: rabi._id },
    { crop_name: 'Soybean', category: 'Oilseed', duration_days: 100, expected_yield: 25, market_price: 4500, description: 'Kharif oilseed', season: kharif._id },
    { crop_name: 'Tomato', category: 'Vegetable', duration_days: 90, expected_yield: 200, market_price: 1500, description: 'Vegetable crop', season: kharif._id }]);
  await M.cultivations.insertMany([
    { land: l1._id, crop: soy._id, season: kharif._id, sowing_date: d('2026-06-20'), harvest_date: d('2026-10-05'), actual_yield: 22 },
    { land: l2._id, crop: wheat._id, season: rabi._id, sowing_date: d('2026-11-10'), harvest_date: d('2027-03-10'), actual_yield: 38 },
    { land: l3._id, crop: tomato._id, season: kharif._id, sowing_date: d('2026-06-25'), harvest_date: d('2026-09-25'), actual_yield: 190 }]);
  const [urea, seed] = await M.inputs.insertMany([
    { input_name: 'Urea', input_type: 'Fertilizer', brand: 'IFFCO', unit: 'kg', cost: 6, quantity_available: 500 },
    { input_name: 'Hybrid Seed', input_type: 'Seed', brand: 'Mahyco', unit: 'kg', cost: 120, quantity_available: 100 }]);
  await M.crop_inputs.insertMany([
    { crop: wheat._id, input: urea._id, quantity_required: 50, application_date: d('2026-11-25'), cost: 300 },
    { crop: tomato._id, input: seed._id, quantity_required: 2, application_date: d('2026-06-24'), cost: 240 }]);
  const [b1, b2] = await M.buyers.insertMany([
    { buyer_name: 'Pune APMC Mandi', phone: '020-24260000', email: 'apmc@example.com', address: 'Market Yard, Pune', buyer_type: 'Mandi' },
    { buyer_name: 'FreshMart Retail', phone: '9811122233', email: 'buy@freshmart.com', address: 'Hinjewadi, Pune', buyer_type: 'Retailer' }]);
  await M.sales.insertMany([
    { farmer: f1._id, buyer: b1._id, crop: soy._id, sale_date: d('2026-10-12'), quantity: 22, price_per_unit: 4500, total_amount: 99000, payment_status: 'Paid' },
    { farmer: f2._id, buyer: b2._id, crop: tomato._id, sale_date: d('2026-09-28'), quantity: 190, price_per_unit: 1500, total_amount: 285000, payment_status: 'Pending' }]);
  await M.activities.insertMany([
    { land: l1._id, crop: soy._id, activity_name: 'Sowing', activity_date: d('2026-06-20'), labour_cost: 4000 },
    { land: l3._id, crop: tomato._id, activity_name: 'Irrigation', activity_date: d('2026-07-15'), labour_cost: 1500 }]);
  await M.equipment.insertMany([
    { equipment_name: 'Mahindra Tractor', equipment_type: 'Tractor', purchase_date: d('2022-03-10'), cost: 650000, status: 'Working' },
    { equipment_name: 'Sprayer', equipment_type: 'Sprayer', purchase_date: d('2024-05-01'), cost: 12000, status: 'Working' }]);
  console.log('Seeded sample data'); process.exit();
})();
