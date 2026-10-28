// Each field: [name, type, refCollection?]  types: text, number, date, ref, select:A,B,C, auto
module.exports = {
  farmers: { label: 'Farmer', plural: 'Farmers', show: ['first_name', 'last_name'], fields: [
    ['first_name','text'],['last_name','text'],['gender','select:Male,Female,Other'],['date_of_birth','date'],
    ['phone','text'],['address','text'],['aadhaar_no','text']] },
  farmer_profiles: { label: 'Farmer Profile', plural: 'Farmer Profiles', show: ['education'], fields: [
    ['farmer','ref','farmers'],['farm_size','number'],['experience_years','number'],['education','text'],['bank_account','text'],['bio','text']] },
  lands: { label: 'Land', plural: 'Lands', show: ['location'], fields: [
    ['farmer','ref','farmers'],['area','number'],['soil_type','select:Black,Red,Alluvial,Sandy,Loamy'],['location','text'],
    ['irrigation_type','select:Drip,Canal,Sprinkler,Rainfed,Well'],['ownership_type','select:Owned,Leased,Shared']] },
  soil_tests: { label: 'Soil Test', plural: 'Soil Tests', show: ['test_date'], fields: [
    ['land','ref','lands'],['test_date','date'],['ph_value','number'],['nitrogen','number'],['phosphorus','number'],['potassium','number'],['organic_carbon','number']] },
  seasons: { label: 'Season', plural: 'Seasons', show: ['season_name'], fields: [
    ['season_name','text'],['start_date','date'],['end_date','date'],['region','text']] },
  crops: { label: 'Crop', plural: 'Crops', show: ['crop_name'], fields: [
    ['crop_name','text'],['category','select:Cereal,Pulse,Vegetable,Fruit,Cash Crop,Oilseed'],['duration_days','number'],
    ['expected_yield','number'],['market_price','number'],['description','text'],['season','ref','seasons']] },
  cultivations: { label: 'Crop Cultivation', plural: 'Cultivations', show: ['sowing_date'], fields: [
    ['land','ref','lands'],['crop','ref','crops'],['season','ref','seasons'],['sowing_date','date'],['harvest_date','date'],['actual_yield','number']] },
  inputs: { label: 'Input', plural: 'Inputs', show: ['input_name'], fields: [
    ['input_name','text'],['input_type','select:Seed,Fertilizer,Pesticide,Other'],['brand','text'],['unit','text'],['cost','number'],['quantity_available','number']] },
  crop_inputs: { label: 'Crop Input', plural: 'Crop Inputs', show: ['application_date'], fields: [
    ['crop','ref','crops'],['input','ref','inputs'],['quantity_required','number'],['application_date','date'],['cost','number']] },
  buyers: { label: 'Buyer', plural: 'Buyers', show: ['buyer_name'], fields: [
    ['buyer_name','text'],['phone','text'],['email','text'],['address','text'],['buyer_type','select:Mandi,Retailer,Wholesaler,Company,Individual']] },
  sales: { label: 'Sale', plural: 'Sales', show: ['sale_date'], fields: [
    ['farmer','ref','farmers'],['buyer','ref','buyers'],['crop','ref','crops'],['sale_date','date'],['quantity','number'],
    ['price_per_unit','number'],['total_amount','auto'],['payment_status','select:Paid,Pending']] },
  activities: { label: 'Farm Activity', plural: 'Farm Activities', show: ['activity_name'], fields: [
    ['land','ref','lands'],['crop','ref','crops'],['activity_name','text'],['activity_date','date'],['labour_cost','number']] },
  equipment: { label: 'Equipment', plural: 'Equipment', show: ['equipment_name'], fields: [
    ['equipment_name','text'],['equipment_type','text'],['purchase_date','date'],['cost','number'],['status','select:Working,Under Repair,Retired']] }
};
