from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = "supersecretkey"

# FIXED: proper session lifetime + cookie settings
app.permanent_session_lifetime = timedelta(days=1)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False     # must be False for localhost
app.config['SESSION_COOKIE_HTTPONLY'] = True

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Darshika12@",
    database="smart_ride_system"
)
cursor = db.cursor(dictionary=True)

def extract_first_name(email):
    return email.split('@')[0].capitalize()

def get_booking_count(user_id):
    cursor.execute("SELECT COUNT(*) AS count FROM rides WHERE user_id=%s", (user_id,))
    return cursor.fetchone()['count']


# ---------------------- ROUTES ----------------------

@app.route('/')
@app.route('/introduction')
def introduction():
    return render_template('introduction.html')

@app.route('/payment')
def pay():
    if not session.get('user_id'):
        return redirect('/login')

    user_id = session['user_id']

    # Fetch latest ACCEPTED & UNPAID ride
    cursor.execute("""
        SELECT *
        FROM rides
        WHERE user_id=%s AND status='accepted' AND payment_status='pending'
        ORDER BY pickup_time DESC LIMIT 1
    """, (user_id,))

    ride = cursor.fetchone()

    # If no ride found → show page with a message
    if not ride:
        return render_template("payment.html", ride=None, name=session['name'])

    # Convert pickup time safely
    if hasattr(ride['pickup_time'], "strftime"):
        ride['pickup_time'] = ride['pickup_time'].strftime("%I:%M %p")

    # -----------------------------
    # 🚍 FARE CALCULATION
    # -----------------------------
    fare_base = 5                     # base fare
    fare_per_student = 50 * ride['num_passengers']  # ₹1 per passenger
    fare_service = 1.50               # service charge

    total = fare_base + fare_per_student + fare_service

    # Add total to ride dictionary
    ride['fare_total'] = f"{total:.2f}"
    ride['fare_base'] = f"{fare_base:.2f}"
    ride['fare_service'] = f"{fare_service:.2f}"
    ride['fare_passenger'] = f"{fare_per_student:.2f}"

    return render_template(
        "payment.html",
        ride=ride,
        name=session['name']
    )


# --- LOGIN PAGE (GET) ---
@app.route('/login')
def login_page():
    return render_template('new_login.html')
@app.route('/payment/confirm', methods=['POST'])
def confirm_payment():
    if not session.get('user_id'):
        return jsonify({"status": "error", "message": "Not logged in"})

    user_id = session['user_id']
    ride_id = request.json.get("ride_id")

    # Update only the specific accepted ride
    cursor.execute("""
        UPDATE rides
        SET payment_status='paid'
        WHERE user_id=%s AND id=%s
    """, (user_id, ride_id))
    db.commit()

    return jsonify({"status": "success"})


# --- SIGNUP ---
@app.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    role = data['role']
    name = data['name']
    email = data['email']
    password = generate_password_hash(data['password'])

    try:
        cursor.execute(
            "INSERT INTO users (name, email, role, password) VALUES (%s,%s,%s,%s)",
            (name, email, role.lower(), password)
        )
        db.commit()

        # FIXED: Permanent session + assign values in correct order
        session.permanent = True
        session['user_id'] = cursor.lastrowid
        session['role'] = role.lower()
        session['email'] = email
        session['name'] = extract_first_name(email)

        redirect_url = '/student' if role.lower() == 'student' else '/driver'
        return jsonify({"status": "success", "redirect": redirect_url})

    except mysql.connector.IntegrityError:
        return jsonify({"status": "error", "message": "Email already exists."})


# --- LOGIN (POST only) ---
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    role = data['role']
    email = data['email']
    password = data['password']

    cursor.execute("SELECT * FROM users WHERE email=%s AND role=%s", (email, role.lower()))
    user = cursor.fetchone()

    if user and check_password_hash(user['password'], password):
        session.permanent = True
        session['user_id'] = user['id']
        session['role'] = role.lower()
        session['email'] = email
        session['name'] = extract_first_name(email)

        redirect_url = '/student' if role.lower() == 'student' else '/driver'
        return jsonify({"status": "success", "redirect": redirect_url})

    return jsonify({"status": "error", "message": "Invalid credentials."})


# ---------------------- STUDENT DASHBOARD ----------------------

@app.route('/student')
def student_dashboard():
    if 'role' not in session or session['role'] != 'student':
        return redirect(url_for('login_page'))


    user_id = session['user_id']

    cursor.execute("""
        SELECT id, pickup, destination, pickup_time, num_passengers, status, payment_status
        FROM rides
        WHERE user_id=%s AND status='pending'
        ORDER BY created_at DESC
    """, (user_id,))
    pending_rides = cursor.fetchall()

    cursor.execute("""
        SELECT id, pickup, destination, pickup_time, num_passengers, status, payment_status
        FROM rides
        WHERE user_id=%s AND status='accepted'
        ORDER BY pickup_time ASC
    """, (user_id,))
    accepted_rides = cursor.fetchall()

    # Convert time
    for b in pending_rides + accepted_rides:
        if hasattr(b['pickup_time'], "strftime"):
            b['pickup_time'] = b['pickup_time'].strftime("%I:%M %p")

    return render_template(
        'student_page.html',
        name=session['name'],
        bookings=pending_rides + accepted_rides
    )


# ---------------------- BOOK RIDE ----------------------

@app.route('/book_ride', methods=['POST'])
def book_ride():
    if not session.get('user_id'):
        return jsonify({"status": "error", "message": "Not logged in."})

    try:
        data = request.get_json()

        pickup = data.get('pickup', '').strip()
        destination = data.get('destination', '').strip()
        pickup_time_str = data.get('pickup_time', '').strip()
        num_passengers = int(data.get('num_passengers', 1))

        if num_passengers < 10:
            return jsonify({
                "status": "error",
                "message": "Minimum 10 students are required to book the bus."
            })

        if not pickup or not destination or not pickup_time_str:
            return jsonify({"status": "error", "message": "Missing ride details."})

        user_id = session['user_id']
        pickup_time = datetime.strptime(pickup_time_str, "%H:%M").replace(
            year=datetime.now().year,
            month=datetime.now().month,
            day=datetime.now().day
        )

        cursor.execute("SELECT COUNT(*) AS ride_count FROM rides WHERE user_id=%s", (user_id,))
        ride_count = cursor.fetchone()['ride_count']
        discount = 35 if (ride_count + 1) % 6 == 0 else 0

        cursor.execute("""
            INSERT INTO rides (user_id, pickup, destination, pickup_time, num_passengers, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
        """, (user_id, pickup, destination, pickup_time, num_passengers))
        db.commit()

        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM rides WHERE id=%s", (new_id,))
        new_ride = cursor.fetchone()

        for key, val in new_ride.items():
            if hasattr(val, "strftime"):
                new_ride[key] = val.strftime("%H:%M")

        new_ride['discount'] = discount

        return jsonify({"status": "success", "ride": new_ride, "discount": discount})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ---------------------- DRIVER DASHBOARD ----------------------

@app.route('/driver')
def driver_dashboard():
    if not session.get('user_id') or session.get('role') != 'driver':
        return redirect('/login')

    cursor.execute("""
        SELECT r.*, u.name AS student_name
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE r.status='pending'
        ORDER BY r.created_at DESC
    """)
    rides = cursor.fetchall()

    return render_template('driver_page.html', name=session['name'], rides=rides)


# ---------------------- ACCEPT RIDE ----------------------

@app.route('/accept_ride', methods=['POST'])
def accept_ride():
    if not session.get('user_id') or session.get('role') != 'driver':
        return jsonify({"status": "error", "message": "Unauthorized"})

    data = request.get_json()
    ride_id = data.get('ride_id')

    cursor.execute("UPDATE rides SET status='accepted' WHERE id=%s", (ride_id,))
    db.commit()

    cursor.execute("""
        SELECT r.*, u.name AS student_name
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE r.id=%s
    """, (ride_id,))
    ride = cursor.fetchone()

    ride['pickup_time'] = ride['pickup_time'].strftime("%H:%M")

    return jsonify({"status": "success", "ride": ride})


# ---------------------- NEW RIDES (Driver Polling) ----------------------

@app.route('/new_rides')
def new_rides():
    cursor.execute("""
        SELECT r.*, u.name AS student_name
        FROM rides r
        JOIN users u ON r.user_id = u.id
        WHERE r.status='pending'
        ORDER BY r.created_at DESC
    """)
    rides = cursor.fetchall()

    for r in rides:
        if isinstance(r['pickup_time'], datetime):
            r['pickup_time'] = r['pickup_time'].strftime('%I:%M %p')

    return jsonify({"rides": rides})


# ---------------------- LOGOUT ----------------------

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')


# ---------------------- RUN APP ----------------------

if __name__ == "__main__":
    app.run(debug=True)
