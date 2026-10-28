# Farmer to Consumer Local Marketplace

farm_market_project/
  database/farm_market.sql      tables, triggers, cursor procedures, sample data
  backend/app.py                Flask + mysql-connector (edit DB password at the top)
  backend/requirements.txt
  frontend/templates/*.html     pages (plain HTML)
  frontend/static/style.css     basic CSS

Steps
1. Run database/farm_market.sql in MySQL Workbench.
2. cd backend ; pip install -r requirements.txt ; python app.py
3. Open http://localhost:5000

Logins: farmer ID 1 / farmer123, consumer ID 1 / user123, admin / admin123
