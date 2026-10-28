"""
Railway Ticket Booking System - Flask Backend API (Stage 3 & Stage 4)
Connects Flask to MySQL via mysql-connector-python and environment variables.
Implements parameterized queries, real-time availability calculation, transaction-safe booking,
unique PNR generation, and booking cancellation.
"""

import os
import random
from pathlib import Path
from datetime import datetime, date
from flask import Flask, jsonify, request, send_from_directory, session
from db import query_db, get_db_connection, test_db_connection, init_database

BASE_DIR = Path(__file__).resolve().parent

# Initialize Flask app configured to serve frontend static assets
app = Flask(
    __name__,
    static_folder=str(BASE_DIR),
    static_url_path=''
)
app.secret_key = os.getenv('SECRET_KEY', 'railconnect_secret_key_stage34_secure_2026')


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def generate_unique_pnr(cursor):
    """
    Generates a unique 10-digit Indian Railways standard numeric PNR string.
    Checks uniqueness in TICKET table before returning.
    """
    while True:
        # Standard 10-digit numeric format (prefix 200-999 + 7 digits)
        pnr = f"{random.randint(200, 999)}{random.randint(1000000, 9999999)}"
        cursor.execute("SELECT Ticket_ID FROM TICKET WHERE PNR_No = %s;", (pnr,))
        if not cursor.fetchone():
            return pnr


# =============================================================================
# 1. FRONTEND HOMEPAGE ROUTE
# =============================================================================
@app.route('/')
def index():
    """Serves the Stage 1 & 3 & 4 responsive application."""
    return send_from_directory(app.static_folder, 'index.html')


# =============================================================================
# 2. HEALTH & DATABASE STATUS ROUTE
# =============================================================================
@app.route('/api/health', methods=['GET'])
def health_check():
    """Tests and returns MySQL database connectivity status and table summary."""
    db_status = test_db_connection()
    status_code = 200 if db_status['success'] else 503
    return jsonify({
        'status': 'healthy' if db_status['success'] else 'unhealthy',
        'database': db_status
    }), status_code


# =============================================================================
# 3. STATIONS API ROUTE (PARAMETERIZED QUERY)
# =============================================================================
@app.route('/api/stations', methods=['GET'])
def get_stations():
    """
    Retrieve all stations or search stations matching a search query.
    Query parameters:
        query (optional): keyword to filter by station name, code, or city.
    """
    search_query = request.args.get('query', '').strip()
    try:
        if search_query:
            like_param = f"%{search_query}%"
            sql = """
                SELECT Station_ID, Station_Name, City, State, Zone, Platform_Count
                FROM STATION
                WHERE Station_ID LIKE %s 
                   OR Station_Name LIKE %s 
                   OR City LIKE %s
                ORDER BY Station_Name ASC;
            """
            stations = query_db(sql, (like_param, like_param, like_param))
        else:
            sql = """
                SELECT Station_ID, Station_Name, City, State, Zone, Platform_Count
                FROM STATION
                ORDER BY Station_Name ASC;
            """
            stations = query_db(sql)

        return jsonify({
            'success': True,
            'count': len(stations),
            'stations': stations
        }), 200
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


# =============================================================================
# 4. TRAIN SEARCH API ROUTE (STAGE 3: DYNAMIC REAL-TIME SEAT AVAILABILITY)
# =============================================================================
@app.route('/api/trains/search', methods=['GET'])
def search_trains():
    """
    Search trains operating between source and destination stations.
    Calculates live seat availability dynamically using actual bookings in MySQL.
    Never hardcodes seat availability.
    """
    src = request.args.get('from') or request.args.get('source')
    dst = request.args.get('to') or request.args.get('destination')
    travel_class = request.args.get('class', 'ALL').strip().upper()
    journey_date = request.args.get('date') or request.args.get('journey_date')

    if not src or not dst:
        return jsonify({
            'success': False,
            'error': 'Missing required parameters: origin (from) and destination (to) are required.'
        }), 400

    src = src.strip().upper()
    dst = dst.strip().upper()

    # Reject identical source and destination
    if src == dst:
        return jsonify({
            'success': False,
            'error': 'Origin and destination stations cannot be identical.'
        }), 400

    # Validate journey date if provided
    if journey_date:
        try:
            j_date_obj = datetime.strptime(journey_date, '%Y-%m-%d').date()
            if j_date_obj < date.today():
                return jsonify({
                    'success': False,
                    'error': 'Journey date cannot be in the past.'
                }), 400
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid journey date format (expected YYYY-MM-DD).'
            }), 400
    else:
        journey_date = str(date.today())

    try:
        sql_trains = """
            SELECT 
                t.Train_No,
                t.Train_Name,
                t.Type,
                t.Source_Station,
                t.Destination_Station,
                t.Total_Coaches,
                t.Running_Days,
                t.Status,
                s_src.Station_Name AS Source_Station_Name,
                s_src.City AS Source_City,
                s_dst.Station_Name AS Destination_Station_Name,
                s_dst.City AS Destination_City
            FROM TRAIN t
            LEFT JOIN STATION s_src ON t.Source_Station = s_src.Station_ID
            LEFT JOIN STATION s_dst ON t.Destination_Station = s_dst.Station_ID
            WHERE (t.Source_Station = %s OR s_src.City LIKE %s OR s_src.Station_Name LIKE %s)
              AND (t.Destination_Station = %s OR s_dst.City LIKE %s OR s_dst.Station_Name LIKE %s);
        """
        like_src = f"%{src}%"
        like_dst = f"%{dst}%"
        params = (src, like_src, like_src, dst, like_dst, like_dst)
        trains = query_db(sql_trains, params)

        enriched_trains = []
        for train in trains:
            train_no = train['Train_No']

            # Retrieve all coaches and total configured seats
            if travel_class and travel_class != 'ALL':
                sql_coaches = """
                    SELECT c.Coach_ID, c.Coach_No, c.Coach_Type, c.Class, c.Capacity, c.Fare,
                           COUNT(s.Seat_ID) as total_seats
                    FROM COACH c
                    LEFT JOIN SEAT s ON c.Coach_ID = s.Coach_ID
                    WHERE c.Train_No = %s AND c.Class = %s
                    GROUP BY c.Coach_ID, c.Coach_No, c.Coach_Type, c.Class, c.Capacity, c.Fare;
                """
                coaches = query_db(sql_coaches, (train_no, travel_class))
            else:
                sql_coaches = """
                    SELECT c.Coach_ID, c.Coach_No, c.Coach_Type, c.Class, c.Capacity, c.Fare,
                           COUNT(s.Seat_ID) as total_seats
                    FROM COACH c
                    LEFT JOIN SEAT s ON c.Coach_ID = s.Coach_ID
                    WHERE c.Train_No = %s
                    GROUP BY c.Coach_ID, c.Coach_No, c.Coach_Type, c.Class, c.Capacity, c.Fare;
                """
                coaches = query_db(sql_coaches, (train_no,))

            # Calculate actual booked seats for this train and date from TICKET
            sql_booked = """
                SELECT s.Coach_ID, COUNT(*) as booked_count
                FROM TICKET tk
                JOIN SEAT s ON tk.Seat_ID = s.Seat_ID
                WHERE tk.Train_No = %s AND tk.Journey_Date = %s AND tk.Booking_Status != 'Cancelled'
                GROUP BY s.Coach_ID;
            """
            booked_map = {r['Coach_ID']: r['booked_count'] for r in query_db(sql_booked, (train_no, journey_date))}

            # Group dynamic availability by Class
            class_summary = {}
            coach_details = []
            for c in coaches:
                cid = c['Coach_ID']
                cls = c['Class']
                tot_seats = c['total_seats']
                booked = booked_map.get(cid, 0)
                available = max(0, tot_seats - booked)
                fare_val = float(c['Fare'])

                c_info = {
                    'Coach_ID': cid,
                    'Coach_No': c['Coach_No'],
                    'Coach_Type': c['Coach_Type'],
                    'Class': cls,
                    'Total_Seats': tot_seats,
                    'Booked_Seats': booked,
                    'Available_Seats': available,
                    'Fare': fare_val
                }
                coach_details.append(c_info)

                if cls not in class_summary:
                    class_summary[cls] = {
                        'Class': cls,
                        'Class_Name': c['Coach_Type'],
                        'Total_Seats': tot_seats,
                        'Available_Seats': available,
                        'Fare': fare_val,
                        'Coach_IDs': [cid]
                    }
                else:
                    class_summary[cls]['Total_Seats'] += tot_seats
                    class_summary[cls]['Available_Seats'] += available
                    class_summary[cls]['Coach_IDs'].append(cid)

            # Fetch scheduled timings
            sql_times = """
                SELECT 
                    MIN(Departure_Time) as Departure_Time,
                    MAX(Arrival_Time) as Arrival_Time
                FROM SCHEDULE
                WHERE Train_No = %s;
            """
            timings = query_db(sql_times, (train_no,), one=True)
            dep_time = str(timings['Departure_Time']) if timings and timings.get('Departure_Time') else '06:00:00'
            arr_time = str(timings['Arrival_Time']) if timings and timings.get('Arrival_Time') else '14:00:00'

            train_dict = dict(train)
            train_dict['Departure_Time'] = dep_time
            train_dict['Arrival_Time'] = arr_time
            train_dict['Journey_Date'] = journey_date
            train_dict['Coaches'] = coach_details
            train_dict['Classes'] = list(class_summary.values())
            train_dict['Available_Classes'] = list(class_summary.keys())
            enriched_trains.append(train_dict)

        return jsonify({
            'success': True,
            'search_criteria': {
                'from': src,
                'to': dst,
                'date': journey_date,
                'class': travel_class
            },
            'count': len(enriched_trains),
            'trains': enriched_trains
        }), 200

    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


# =============================================================================
# 5. TRAIN DETAILS & COACHES API ROUTE (STAGE 3)
# =============================================================================
@app.route('/api/trains/<int:train_no>', methods=['GET'])
def get_train_details(train_no):
    """Retrieves full details for a train including coaches and schedule."""
    try:
        sql_train = """
            SELECT Train_No, Train_Name, Type, Source_Station, Destination_Station,
                   Total_Coaches, Running_Days, Status
            FROM TRAIN WHERE Train_No = %s;
        """
        train = query_db(sql_train, (train_no,), one=True)
        if not train:
            return jsonify({'success': False, 'error': f'Train {train_no} not found.'}), 404

        sql_coaches = "SELECT Coach_ID, Coach_No, Coach_Type, Class, Capacity, Fare FROM COACH WHERE Train_No = %s;"
        coaches = query_db(sql_coaches, (train_no,))
        for c in coaches:
            c['Fare'] = float(c['Fare'])

        return jsonify({'success': True, 'train': train, 'coaches': coaches}), 200
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


@app.route('/api/trains/<int:train_no>/coaches', methods=['GET'])
def get_train_coaches(train_no):
    """Retrieves coaches for a train with dynamic availability for a specific journey date."""
    journey_date = request.args.get('date') or request.args.get('journey_date') or str(date.today())
    try:
        sql = """
            SELECT c.Coach_ID, c.Coach_No, c.Coach_Type, c.Class, c.Capacity, c.Fare,
                   COUNT(s.Seat_ID) as total_seats
            FROM COACH c
            LEFT JOIN SEAT s ON c.Coach_ID = s.Coach_ID
            WHERE c.Train_No = %s
            GROUP BY c.Coach_ID, c.Coach_No, c.Coach_Type, c.Class, c.Capacity, c.Fare
            ORDER BY c.Coach_ID ASC;
        """
        coaches = query_db(sql, (train_no,))
        if not coaches:
            return jsonify({'success': False, 'error': f'No coaches found for train {train_no}.'}), 404

        sql_booked = """
            SELECT s.Coach_ID, COUNT(*) as booked_count
            FROM TICKET tk
            JOIN SEAT s ON tk.Seat_ID = s.Seat_ID
            WHERE tk.Train_No = %s AND tk.Journey_Date = %s AND tk.Booking_Status != 'Cancelled'
            GROUP BY s.Coach_ID;
        """
        booked_map = {r['Coach_ID']: r['booked_count'] for r in query_db(sql_booked, (train_no, journey_date))}

        result = []
        for c in coaches:
            cid = c['Coach_ID']
            booked = booked_map.get(cid, 0)
            avail = max(0, c['total_seats'] - booked)
            cd = dict(c)
            cd['Booked_Seats'] = booked
            cd['Available_Seats'] = avail
            cd['Fare'] = float(c['Fare'])
            result.append(cd)

        return jsonify({'success': True, 'train_no': train_no, 'journey_date': journey_date, 'coaches': result}), 200
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


# =============================================================================
# 6. SEAT SELECTION API ROUTE (STAGE 3: LIVE AVAILABLE & BOOKED SEATS)
# =============================================================================
@app.route('/api/seats', methods=['GET'])
def get_seats():
    """
    Retrieve seats for a specific coach, train, and journey date.
    Calculates live booked vs available status based on actual active bookings in MySQL.
    """
    train_no = request.args.get('train_no')
    journey_date = request.args.get('journey_date') or request.args.get('date')
    coach_id = request.args.get('coach_id')

    if not coach_id or not train_no or not journey_date:
        return jsonify({
            'success': False,
            'error': 'Missing required query parameters: train_no, journey_date, and coach_id are required.'
        }), 400

    try:
        # Check coach exists and get details
        coach = query_db("SELECT Coach_ID, Coach_No, Class, Coach_Type, Fare FROM COACH WHERE Coach_ID = %s AND Train_No = %s;", (coach_id, train_no), one=True)
        if not coach:
            return jsonify({'success': False, 'error': 'Coach not found for this train.'}), 404

        # Query all seats with real-time booked status for this date
        sql_seats = """
            SELECT 
                s.Seat_ID,
                s.Coach_ID,
                s.Coach_No,
                s.Seat_No,
                s.Berth_Type,
                CASE 
                    WHEN tk.Ticket_ID IS NOT NULL AND tk.Booking_Status != 'Cancelled' THEN 'booked'
                    ELSE 'available'
                END AS status
            FROM SEAT s
            LEFT JOIN TICKET tk ON s.Seat_ID = tk.Seat_ID 
                                AND tk.Train_No = %s 
                                AND tk.Journey_Date = %s 
                                AND tk.Booking_Status != 'Cancelled'
            WHERE s.Coach_ID = %s
            ORDER BY s.Seat_No ASC;
        """
        seats = query_db(sql_seats, (train_no, journey_date, coach_id))

        available_count = sum(1 for s in seats if s['status'] == 'available')
        booked_count = sum(1 for s in seats if s['status'] == 'booked')

        return jsonify({
            'success': True,
            'train_no': int(train_no),
            'journey_date': journey_date,
            'coach': {
                'coach_id': coach['Coach_ID'],
                'coach_no': coach['Coach_No'],
                'class': coach['Class'],
                'coach_type': coach['Coach_Type'],
                'fare': float(coach['Fare'])
            },
            'total_seats': len(seats),
            'available_count': available_count,
            'booked_count': booked_count,
            'seats': seats
        }), 200

    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


# =============================================================================
# 7. SCHEDULES API ROUTE (PARAMETERIZED QUERY)
# =============================================================================
@app.route('/api/schedules/<int:train_no>', methods=['GET'])
@app.route('/api/trains/<int:train_no>/schedule', methods=['GET'])
def get_schedule(train_no):
    """Retrieve ordered station schedule for a given Train_No."""
    try:
        train = query_db("SELECT Train_No, Train_Name, Type, Source_Station, Destination_Station, Running_Days, Status FROM TRAIN WHERE Train_No = %s;", (train_no,), one=True)
        if not train:
            return jsonify({'success': False, 'error': f'Train {train_no} not found.'}), 404

        sql_schedule = """
            SELECT 
                sch.Schedule_ID,
                sch.Train_No,
                sch.Station_ID,
                stn.Station_Name,
                stn.City,
                stn.State,
                sch.Arrival_Time,
                sch.Departure_Time,
                sch.Day_No,
                sch.Platform_No
            FROM SCHEDULE sch
            JOIN STATION stn ON sch.Station_ID = stn.Station_ID
            WHERE sch.Train_No = %s
            ORDER BY sch.Day_No ASC,
                     COALESCE(sch.Arrival_Time, sch.Departure_Time) ASC;
        """
        stops = query_db(sql_schedule, (train_no,))
        formatted_stops = []
        for stop in stops:
            stop_dict = dict(stop)
            stop_dict['Arrival_Time'] = str(stop['Arrival_Time']) if stop.get('Arrival_Time') is not None else None
            stop_dict['Departure_Time'] = str(stop['Departure_Time']) if stop.get('Departure_Time') is not None else None
            formatted_stops.append(stop_dict)

        return jsonify({'success': True, 'train': train, 'total_stops': len(formatted_stops), 'schedule': formatted_stops}), 200
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


# =============================================================================
# 8. BOOKINGS API ROUTE (STAGE 4: TRANSACTION-SAFE BOOKING & PNR GENERATION)
# =============================================================================
@app.route('/api/bookings', methods=['POST'])
def create_booking():
    """
    Creates a new passenger booking in MySQL using database transactions.
    Enforces server-side fare calculation, seat conflict prevention (SELECT ... FOR UPDATE),
    and unique 10-digit PNR generation.
    """
    data = request.get_json() or {}

    train_no = data.get('train_no')
    journey_date = data.get('journey_date')
    coach_id = data.get('coach_id')
    seat_id = data.get('seat_id')
    travel_class = data.get('class', 'General')
    quota = data.get('quota', 'General')
    passenger = data.get('passenger', {})

    # Validation
    if not all([train_no, journey_date, coach_id, seat_id, travel_class, passenger]):
        return jsonify({'success': False, 'error': 'Missing required booking parameters.'}), 400

    p_name = passenger.get('name', '').strip()
    p_gender = passenger.get('gender', 'Male').strip()
    p_dob = passenger.get('dob', '').strip()
    p_email = passenger.get('email', '').strip()
    p_phone = passenger.get('phone', '').strip()
    p_address = passenger.get('address', '').strip()
    p_aadhaar = passenger.get('aadhaar', '').strip()

    if not p_name or len(p_name) < 2:
        return jsonify({'success': False, 'error': 'Please provide a valid passenger name (minimum 2 characters).'}), 400
    if not p_email or '@' not in p_email:
        return jsonify({'success': False, 'error': 'Please provide a valid email address.'}), 400
    if not p_phone or len(p_phone) < 10:
        return jsonify({'success': False, 'error': 'Please provide a valid 10-digit mobile phone number.'}), 400
    if not p_aadhaar or len(p_aadhaar) != 12 or not p_aadhaar.isdigit():
        return jsonify({'success': False, 'error': 'Please provide a valid 12-digit Aadhaar number.'}), 400
    if not p_dob:
        return jsonify({'success': False, 'error': 'Please provide a valid date of birth.'}), 400

    try:
        j_date_obj = datetime.strptime(journey_date, '%Y-%m-%d').date()
        if j_date_obj < date.today():
            return jsonify({'success': False, 'error': 'Journey date cannot be in the past.'}), 400
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid journey date format (YYYY-MM-DD expected).'}), 400

    # Start Database Transaction
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # 1. Verify Coach and retrieve verified server-side Fare
        cursor.execute("SELECT Coach_ID, Coach_No, Class, Fare FROM COACH WHERE Coach_ID = %s AND Train_No = %s;", (coach_id, train_no))
        coach_row = cursor.fetchone()
        if not coach_row:
            conn.rollback()
            return jsonify({'success': False, 'error': 'Invalid coach or train selection.'}), 400
        fare_amount = coach_row['Fare']
        coach_no = coach_row['Coach_No']
        travel_class = coach_row['Class']

        # 2. Verify Seat belongs to this Coach
        cursor.execute("SELECT Seat_ID, Seat_No, Berth_Type FROM SEAT WHERE Seat_ID = %s AND Coach_ID = %s;", (seat_id, coach_id))
        seat_row = cursor.fetchone()
        if not seat_row:
            conn.rollback()
            return jsonify({'success': False, 'error': 'Selected seat does not belong to the selected coach.'}), 400
        seat_no = seat_row['Seat_No']
        berth_type = seat_row['Berth_Type']

        # 3. Concurrency Lock: Prevent duplicate seat bookings with FOR UPDATE
        cursor.execute("""
            SELECT Ticket_ID FROM TICKET 
            WHERE Seat_ID = %s AND Train_No = %s AND Journey_Date = %s AND Booking_Status != 'Cancelled'
            FOR UPDATE;
        """, (seat_id, train_no, journey_date))
        if cursor.fetchone():
            conn.rollback()
            return jsonify({
                'success': False,
                'error': f'Seat {seat_no} in Coach {coach_no} was just reserved by another passenger. Please select another seat.'
            }), 409

        # 4. Create or update passenger record in PASSENGER
        cursor.execute("SELECT Passenger_ID FROM PASSENGER WHERE Email = %s OR Aadhaar_No = %s;", (p_email, p_aadhaar))
        existing_p = cursor.fetchone()
        if existing_p:
            passenger_id = existing_p['Passenger_ID']
            cursor.execute("""
                UPDATE PASSENGER 
                SET Name = %s, Gender = %s, Date_of_Birth = %s, Phone_No = %s, Address = %s 
                WHERE Passenger_ID = %s;
            """, (p_name, p_gender, p_dob, p_phone, p_address, passenger_id))
        else:
            cursor.execute("""
                INSERT INTO PASSENGER (Name, Gender, Date_of_Birth, Email, Phone_No, Address, Aadhaar_No)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (p_name, p_gender, p_dob, p_email, p_phone, p_address, p_aadhaar))
            passenger_id = cursor.lastrowid

        # 5. Generate Unique 10-digit PNR
        pnr_no = generate_unique_pnr(cursor)

        # 6. Insert new Ticket
        cursor.execute("""
            INSERT INTO TICKET (Passenger_ID, Seat_ID, Train_No, PNR_No, Booking_Date, Journey_Date, Booking_Status, Class, Quota, Amount)
            VALUES (%s, %s, %s, %s, NOW(), %s, 'Confirmed', %s, %s, %s);
        """, (passenger_id, seat_id, train_no, pnr_no, journey_date, travel_class, quota, fare_amount))
        ticket_id = cursor.lastrowid

        # Commit Transaction
        conn.commit()

        # Save to Flask Session
        session['passenger_id'] = passenger_id
        session['passenger_email'] = p_email

        # Retrieve Train Details for Boarding Pass
        cursor.execute("""
            SELECT t.Train_Name, t.Source_Station, t.Destination_Station,
                   s_src.Station_Name as Source_Name, s_dst.Station_Name as Dest_Name
            FROM TRAIN t
            LEFT JOIN STATION s_src ON t.Source_Station = s_src.Station_ID
            LEFT JOIN STATION s_dst ON t.Destination_Station = s_dst.Station_ID
            WHERE t.Train_No = %s;
        """, (train_no,))
        train_info = cursor.fetchone()

        return jsonify({
            'success': True,
            'message': 'Booking confirmed successfully!',
            'ticket': {
                'ticket_id': ticket_id,
                'pnr': pnr_no,
                'train_no': train_no,
                'train_name': train_info['Train_Name'] if train_info else '',
                'source_station': train_info['Source_Station'] if train_info else '',
                'source_name': train_info['Source_Name'] if train_info else '',
                'destination_station': train_info['Destination_Station'] if train_info else '',
                'destination_name': train_info['Dest_Name'] if train_info else '',
                'journey_date': journey_date,
                'booking_date': str(datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                'coach_no': coach_no,
                'seat_no': seat_no,
                'berth_type': berth_type,
                'class': travel_class,
                'quota': quota,
                'fare': float(fare_amount),
                'status': 'Confirmed',
                'passenger': {
                    'name': p_name,
                    'gender': p_gender,
                    'email': p_email,
                    'phone': p_phone,
                    'aadhaar': f"XXXX-XXXX-{p_aadhaar[-4:]}"
                }
            }
        }), 201

    except Exception as err:
        conn.rollback()
        return jsonify({'success': False, 'error': f'Booking failed: {str(err)}'}), 500
    finally:
        cursor.close()
        conn.close()


# =============================================================================
# 9. MY BOOKINGS API ROUTE (STAGE 4: BOOKING HISTORY RETRIEVAL)
# =============================================================================
@app.route('/api/bookings', methods=['GET'])
def get_bookings():
    """
    Retrieve actual bookings from MySQL.
    Filters by pnr, email, phone, or current session.
    """
    pnr = request.args.get('pnr', '').strip()
    email = request.args.get('email', '').strip()
    phone = request.args.get('phone', '').strip()

    conditions = []
    params = []

    if pnr:
        conditions.append("tk.PNR_No = %s")
        params.append(pnr)
    if email:
        conditions.append("LOWER(p.Email) = LOWER(%s)")
        params.append(email)
    if phone:
        conditions.append("p.Phone_No = %s")
        params.append(phone)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else "WHERE 1=1"

    sql = f"""
        SELECT 
            tk.Ticket_ID,
            tk.PNR_No,
            tk.Booking_Date,
            tk.Journey_Date,
            tk.Booking_Status,
            tk.Class,
            tk.Quota,
            tk.Amount,
            p.Passenger_ID,
            p.Name AS Passenger_Name,
            p.Gender,
            p.Email,
            p.Phone_No,
            t.Train_No,
            t.Train_Name,
            t.Source_Station,
            t.Destination_Station,
            s_src.Station_Name as Source_Name,
            s_dst.Station_Name as Dest_Name,
            s.Coach_No,
            s.Seat_No,
            s.Berth_Type
        FROM TICKET tk
        JOIN PASSENGER p ON tk.Passenger_ID = p.Passenger_ID
        LEFT JOIN TRAIN t ON tk.Train_No = t.Train_No
        LEFT JOIN STATION s_src ON t.Source_Station = s_src.Station_ID
        LEFT JOIN STATION s_dst ON t.Destination_Station = s_dst.Station_ID
        LEFT JOIN SEAT s ON tk.Seat_ID = s.Seat_ID
        {where_clause}
        ORDER BY tk.Booking_Date DESC
        LIMIT 50;
    """
    try:
        bookings = query_db(sql, tuple(params))
        formatted = []
        for b in bookings:
            bd = dict(b)
            bd['Booking_Date'] = str(bd['Booking_Date'])
            bd['Journey_Date'] = str(bd['Journey_Date'])
            bd['Amount'] = float(bd['Amount'])
            formatted.append(bd)

        return jsonify({'success': True, 'count': len(formatted), 'bookings': formatted}), 200
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


# =============================================================================
# 10. BOOKING CANCELLATION API ROUTE (STAGE 4: SAFE STATUS UPDATE)
# =============================================================================
@app.route('/api/bookings/<pnr_no>/cancel', methods=['POST'])
def cancel_booking(pnr_no):
    """
    Cancels an eligible booking in MySQL.
    Safely updates Booking_Status to 'Cancelled' (does not physically delete).
    Immediately restores seat availability for that train and date.
    """
    pnr_clean = pnr_no.strip()
    data = request.get_json() or {}
    verify_email = data.get('email', '').strip().lower()
    verify_phone = data.get('phone', '').strip()

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        cursor.execute("""
            SELECT tk.Ticket_ID, tk.PNR_No, tk.Booking_Status, tk.Amount, tk.Journey_Date,
                   p.Name, p.Email, p.Phone_No, t.Train_Name
            FROM TICKET tk
            JOIN PASSENGER p ON tk.Passenger_ID = p.Passenger_ID
            LEFT JOIN TRAIN t ON tk.Train_No = t.Train_No
            WHERE tk.PNR_No = %s
            FOR UPDATE;
        """, (pnr_clean,))
        ticket = cursor.fetchone()

        if not ticket:
            conn.rollback()
            return jsonify({'success': False, 'error': f'Booking with PNR {pnr_clean} not found.'}), 404

        if ticket['Booking_Status'] == 'Cancelled':
            conn.rollback()
            return jsonify({'success': False, 'error': f'Ticket with PNR {pnr_clean} is already cancelled.'}), 400

        # Security validation if provided
        if verify_email and ticket['Email'].lower() != verify_email:
            conn.rollback()
            return jsonify({'success': False, 'error': 'Verification failed: Email does not match booking record.'}), 403
        if verify_phone and ticket['Phone_No'] != verify_phone:
            conn.rollback()
            return jsonify({'success': False, 'error': 'Verification failed: Phone does not match booking record.'}), 403

        # Update status safely
        cursor.execute("UPDATE TICKET SET Booking_Status = 'Cancelled' WHERE Ticket_ID = %s;", (ticket['Ticket_ID'],))
        conn.commit()

        fare = float(ticket['Amount'])
        cancellation_charge = round(fare * 0.10, 2)
        refund_amount = round(fare - cancellation_charge, 2)

        return jsonify({
            'success': True,
            'message': f'Ticket with PNR {pnr_clean} has been successfully cancelled.',
            'cancellation': {
                'pnr': pnr_clean,
                'passenger_name': ticket['Name'],
                'train_name': ticket['Train_Name'],
                'journey_date': str(ticket['Journey_Date']),
                'fare': fare,
                'cancellation_fee': cancellation_charge,
                'refund_amount': refund_amount,
                'status': 'Cancelled'
            }
        }), 200

    except Exception as err:
        conn.rollback()
        return jsonify({'success': False, 'error': f'Cancellation failed: {str(err)}'}), 500
    finally:
        cursor.close()
        conn.close()


# =============================================================================
# 11. PNR STATUS ENQUIRY ROUTE
# =============================================================================
@app.route('/api/pnr/<pnr_no>', methods=['GET'])
def get_pnr_status(pnr_no):
    """Retrieve reservation status for a 10-digit PNR number."""
    pnr_clean = pnr_no.strip()
    if len(pnr_clean) != 10 or not pnr_clean.isdigit():
        return jsonify({'success': False, 'error': 'PNR must be exactly 10 numeric digits.'}), 400

    try:
        sql = """
            SELECT 
                tk.Ticket_ID,
                tk.PNR_No,
                tk.Booking_Date,
                tk.Journey_Date,
                tk.Booking_Status,
                tk.Class,
                tk.Quota,
                tk.Amount,
                p.Name AS Passenger_Name,
                p.Gender,
                p.Email,
                p.Phone_No,
                t.Train_No,
                t.Train_Name,
                s.Coach_No,
                s.Seat_No,
                s.Berth_Type
            FROM TICKET tk
            JOIN PASSENGER p ON tk.Passenger_ID = p.Passenger_ID
            LEFT JOIN TRAIN t ON tk.Train_No = t.Train_No
            LEFT JOIN SEAT s ON tk.Seat_ID = s.Seat_ID
            WHERE tk.PNR_No = %s;
        """
        ticket = query_db(sql, (pnr_clean,), one=True)
        if not ticket:
            return jsonify({'success': False, 'error': f'PNR {pnr_clean} not found.'}), 404

        ticket_data = dict(ticket)
        ticket_data['Booking_Date'] = str(ticket_data['Booking_Date'])
        ticket_data['Journey_Date'] = str(ticket_data['Journey_Date'])
        ticket_data['Amount'] = float(ticket_data['Amount'])

        return jsonify({'success': True, 'pnr_status': ticket_data}), 200
    except Exception as err:
        return jsonify({'success': False, 'error': str(err)}), 500


# =============================================================================
# 12. DATABASE INITIALIZATION API ROUTE
# =============================================================================
@app.route('/api/init-db', methods=['POST'])
def init_db_endpoint():
    """Administrative endpoint to execute schema.sql and populate sample records."""
    ok, msg = init_database()
    status_code = 200 if ok else 500
    return jsonify({'success': ok, 'message': msg}), status_code


# =============================================================================
# APPLICATION ENTRYPOINT
# =============================================================================
if __name__ == '__main__':
    import sys
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    print(f"[SERVER] Starting Railway Booking System backend on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
