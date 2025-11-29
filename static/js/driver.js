document.addEventListener('DOMContentLoaded', () => {

    // Accept Ride
    document.querySelectorAll('.accept-ride-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const rideId = btn.getAttribute('data-ride-id');
            fetch('/accept_ride', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ride_id: rideId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    btn.closest('.ride-card').remove();
                    alert('Ride accepted!');
                }
            });
        });
    });

    // Polling new rides every 5 seconds
    setInterval(() => {
        fetch('/new_rides')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('ride-requests');
            container.innerHTML = '';
            if (data.rides.length > 0) {
                data.rides.forEach(ride => {
                    container.innerHTML += `
                    <div class="ride-card fade-in" data-ride-id="${ride.id}">
                        <div class="ride-card-header">
                            <div class="ride-time">${ride.pickup_time}</div>
                            <div class="ride-students">${ride.num_passengers} student${ride.num_passengers > 1 ? 's' : ''}</div>
                        </div>
                        <div class="ride-locations">
                            <div class="location">
                                <div class="location-icon pickup-icon">
                                    <i class="fas fa-map-marker-alt"></i>
                                </div>
                                <div class="location-text">
                                    <strong>Pickup:</strong> ${ride.pickup}
                                </div>
                            </div>
                            <div class="location">
                                <div class="location-icon dropoff-icon">
                                    <i class="fas fa-flag-checkered"></i>
                                </div>
                                <div class="location-text">
                                    <strong>Dropoff:</strong> ${ride.destination}
                                </div>
                            </div>
                        </div>
                        <div class="ride-actions">
                            <button class="btn btn-primary accept-ride-btn" data-ride-id="${ride.id}">Accept Ride</button>
                        </div>
                    </div>`;
                });
            } else {
                container.innerHTML = '<p>No ride requests currently.</p>';
            }
        });
    }, 5000);
});



    
        document.addEventListener('DOMContentLoaded', () => {

            // Render ride request card
            function renderRideRequest(ride) {
                return `
                <div class="ride-card fade-in" data-ride-id="${ride.id}">
                    <div class="ride-card-header">
                        <div class="ride-time">${ride.pickup_time}</div>
                        <div class="ride-students">${ride.num_passengers} student${ride.num_passengers > 1 ? 's' : ''}</div>
                    </div>
                    <div class="ride-locations">
                        <div class="location">
                            <div class="location-icon pickup-icon"><i class="fas fa-map-marker-alt"></i></div>
                            <div class="location-text"><strong>Pickup:</strong> ${ride.pickup}</div>
                        </div>
                        <div class="location">
                            <div class="location-icon dropoff-icon"><i class="fas fa-flag-checkered"></i></div>
                            <div class="location-text"><strong>Dropoff:</strong> ${ride.destination}</div>
                        </div>
                    </div>
                    <div class="ride-actions">
                        <button class="btn btn-primary accept-ride-btn" data-ride-id="${ride.id}">Accept Ride</button>
                    </div>
                </div>`;
            }

            // Render ride card in My Rides panel
            function renderMyRide(ride) {
                return `
                <div class="ride-card fade-in">
                    <span class="ride-status status-active">In Progress</span>
                    <div class="ride-card-header">
                        <div class="ride-time">${ride.pickup_time}</div>
                        <div class="ride-students">${ride.num_passengers} student${ride.num_passengers > 1 ? 's' : ''}</div>
                    </div>
                    <div class="ride-locations">
                        <div class="location">
                            <div class="location-icon pickup-icon"><i class="fas fa-map-marker-alt"></i></div>
                            <div class="location-text"><strong>Pickup:</strong> ${ride.pickup}</div>
                        </div>
                        <div class="location">
                            <div class="location-icon dropoff-icon"><i class="fas fa-flag-checkered"></i></div>
                            <div class="location-text"><strong>Dropoff:</strong> ${ride.destination}</div>
                        </div>
                    </div>
                </div>`;
            }

            // Attach accept button events
            function attachAcceptButtons() {
                document.querySelectorAll('.accept-ride-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const rideId = btn.dataset.rideId;
                        fetch('/accept_ride', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ride_id: rideId })
                        })
                        .then(res => res.json())
                        .then(data => {
                            if (data.status === 'success') {
                                // Move ride to My Rides panel
                                const myRidesContainer = document.getElementById('my-rides');
                                myRidesContainer.insertAdjacentHTML('afterbegin', renderMyRide(data.ride));
                                // Remove from Ride Requests
                                btn.closest('.ride-card').remove();
                                updateRideCount();
                                alert('Ride accepted!');
                            }
                        });
                    });
                });
            }

            // Update ride count badge
            function updateRideCount() {
                const count = document.querySelectorAll('#ride-requests .ride-card').length;
                document.getElementById('ride-count').textContent = count;
            }

            // Fetch ride requests from server
            async function fetchRideRequests() {
                const res = await fetch('/new_rides');
                const data = await res.json();
                const container = document.getElementById('ride-requests');
                container.innerHTML = '';
                if (data.rides.length > 0) {
                    data.rides.forEach(ride => {
                        container.innerHTML += renderRideRequest(ride);
                    });
                    attachAcceptButtons();
                } else {
                    container.innerHTML = '<p>No ride requests currently.</p>';
                }
                updateRideCount();
            }

            // Initial load and polling
            fetchRideRequests();
            setInterval(fetchRideRequests, 5000);

        });
   