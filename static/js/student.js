// ---------- DOM Elements ----------
const rideForm = document.getElementById('ride-form');
const upcomingRidesContainer = document.getElementById('upcoming-rides');
const rideUpdatesContainer = document.getElementById('ride-updates');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const studentCountElem = document.getElementById('student-count');

let studentCount = 1;

// ---------- Passenger Counter ----------
decreaseBtn.addEventListener('click', () => {
    if (studentCount > 1) studentCount--;
    studentCountElem.textContent = studentCount;
});

increaseBtn.addEventListener('click', () => {
    studentCount++;
    studentCountElem.textContent = studentCount;
});

// ---------- Ride Booking ----------
rideForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pickup = document.getElementById('pickup').value.trim();
    const destination = document.getElementById('destination').value.trim();
    const pickup_time = document.getElementById('pickup-time').value;

    if (!pickup || !destination || !pickup_time) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const res = await fetch('/book_ride', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pickup,
                destination,
                pickup_time,
                num_passengers: studentCount
            })
        });

        const data = await res.json();

        if (data.status === "success") {
            // Notification popup
            let discountMsg = "";
            if (data.discount > 0) {
                discountMsg = "🎉 Congrats! You’ve unlocked a 35% OFF ride!";
                addRideUpdate("You’ve unlocked a 35% discount on this ride!");
            } else {
                discountMsg = "✅ Ride request sent to drivers!";
                addRideUpdate("Ride request sent successfully!");
            }
            alert(discountMsg);

            // Add ride to “My Bookings”
            addUpcomingRide({
                pickup: data.ride.pickup,
                destination: data.ride.destination,
                pickup_time: data.ride.pickup_time,
                num_passengers: data.ride.num_passengers
            }, data.discount > 0);

        } else {
            alert(data.message || "Something went wrong!");
        }

    } catch (err) {
        console.error("Error booking ride:", err);
        alert("Server error. Please try again.");
    }
});

// ---------- Functions ----------
function addUpcomingRide(ride, isDiscounted = false) {
    const rideCard = document.createElement('div');
    rideCard.className = 'ride-card';
    if (isDiscounted) {
        rideCard.style.border = '2px solid gold';
        rideCard.style.boxShadow = '0 0 10px gold';
    }

    rideCard.innerHTML = `
        <div class="ride-header">
            <span class="student-name">You</span>
            <span class="ride-time">${ride.pickup_time}</span>
        </div>
        <div class="ride-details">
            <div class="location">
                <i class="fas fa-map-marker-alt"></i>
                <span>${ride.pickup}</span>
            </div>
            <i class="fas fa-arrow-right"></i>
            <div class="location">
                <i class="fas fa-flag-checkered"></i>
                <span>${ride.destination}</span>
            </div>
        </div>
        <div class="passengers">
            <i class="fas fa-users"></i>
            <span>${ride.num_passengers} passengers</span>
        </div>
        ${isDiscounted ? '<div class="discount-badge">🎉 35% OFF</div>' : ''}
    `;
    upcomingRidesContainer.prepend(rideCard);
}

function addRideUpdate(message) {
    const updateItem = document.createElement('div');
    updateItem.className = 'booking-item';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    updateItem.innerHTML = `
        <div class="booking-info">
            <div class="booking-locations">
                <span>${message}</span>
            </div>
            <div class="booking-time">${timestamp}</div>
        </div>
    `;
    rideUpdatesContainer.prepend(updateItem);
}


// Add new pending ride after booking
function addPendingRide(ride) {
    const container = document.getElementById('pending-rides');
    const rideCard = document.createElement('div');
    rideCard.className = 'ride-card';
    rideCard.innerHTML = `
        <div><strong>Pickup:</strong> ${ride.pickup}</div>
        <div><strong>Destination:</strong> ${ride.destination}</div>
        <div><strong>Time:</strong> ${ride.pickup_time}</div>
        <div class="status pending">Pending</div>
    `;
    container.prepend(rideCard);
}

// Move ride from pending to upcoming when accepted
function moveToUpcomingRide(ride) {
    // Remove from pending
    const pendingContainer = document.getElementById('pending-rides');
    const cards = pendingContainer.querySelectorAll('.ride-card');
    cards.forEach(card => {
        if (card.querySelector('div').textContent.includes(ride.pickup)) {
            card.remove();
        }
    });

    // Add to upcoming
    const upcomingContainer = document.getElementById('upcoming-rides');
    const rideCard = document.createElement('div');
    rideCard.className = 'ride-card';
    rideCard.innerHTML = `
        <div><strong>Pickup:</strong> ${ride.pickup}</div>
        <div><strong>Destination:</strong> ${ride.destination}</div>
        <div><strong>Time:</strong> ${ride.pickup_time}</div>
        <div class="status accepted">Accepted</div>
    `;
    upcomingContainer.prepend(rideCard);
}
