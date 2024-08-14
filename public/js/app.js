document.addEventListener('DOMContentLoaded', () => {
  const para = document.querySelector("p");
  const showGeofenceBtn = document.querySelector('#showGeofenceBtn');

  // Initialize the map
  var map = L.map('map').setView([51.505, -0.09], 15);
  let mylat = 0;
  let mylong = 0;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  let geofenceCircle = null;
  let userMarker = null;
  let isInsideGeofence = false;

  const geofenceLat = 19.07448;
  const geofenceLng = 72.8812857;
  const geofenceRadius = 500;
  const marker = L.marker([51.505, -0.09]).addTo(map);

  const showGeofenceCircle = () => {
      if (!geofenceCircle) {
          geofenceCircle = L.circle([geofenceLat, geofenceLng], {
              color: 'red',
              fillColor: '#f03',
              fillOpacity: 0.5,
              radius: geofenceRadius,
          }).addTo(map);

          map.fitBounds(geofenceCircle.getBounds());
      }
  };
  showGeofenceCircle();

  document.getElementById('btnn').addEventListener('click', () => {
      if (navigator.geolocation) {
          setInterval(() => {
              navigator.geolocation.getCurrentPosition(position => {
                  const { latitude, longitude } = position.coords;
                  if (latitude != mylat || longitude != mylong) {
                      callapi(latitude, longitude);
                  }
              });
          }, 5000);
      } else {
          alert('Old browser. Please use a newer one.');
      }
  });

  function callapi(latitude, longitude) {
      mylat = latitude;
      mylong = longitude;
      map.setView([latitude, longitude], 16);
      marker.setLatLng([latitude, longitude]);
      socket.emit("send-admin", { latitude, longitude });
      axios.post('/geo/data', { latitude, longitude })
          .then(response => {
              para.innerHTML = "";
              para.innerHTML = `<p>${response.data.message}</p>`;
              console.log(response.data);
          })
          .catch(error => console.error(error));
  }

  if (showGeofenceBtn) {
      showGeofenceBtn.addEventListener('click', () => {
          alert('Geofence button clicked');
      });
  }

  const success = (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      console.log('Your current location:');
      console.log(`Latitude: ${lat}`);
      console.log(`Longitude: ${lng}`);
      const userLocation = [lat, lng];

      if (!userMarker) {
          userMarker = L.marker(userLocation).addTo(map)
              .bindPopup("You are here.")
              .openPopup();
      } else {
          userMarker.setLatLng(userLocation);
      }

      const wasInsideGeofence = isInsideGeofence;
      isInsideGeofence = checkGeofenceStatus(userLocation);

      if (isInsideGeofence && !wasInsideGeofence) {
          console.log('Entered geofence at:', new Date().toLocaleString());
      } else if (!isInsideGeofence && wasInsideGeofence) {
          console.log('Left geofence at:', new Date().toLocaleString());
      }

      const data = { latitude: lat, longitude: lng, timestamp: new Date() };
      fetch('http://localhost:3000/geo/data', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
      })
      .then(response => {
          if (!response.ok) {
              throw new Error('Network response was not ok');
          }
          return response.json();
      })
      .then(data => {
          console.log('Location data sent successfully:', data);
      })
      .catch(error => {
          console.error('Error sending location data:', error);
      });

      map.setView(userLocation, 16);
  };

  const checkGeofenceStatus = (userLocation) => {
      const distance = getDistanceFromLatLonInKm(userLocation[0], userLocation[1], geofenceLat, geofenceLng);
      return distance <= geofenceRadius;
  };

  function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
  }

  function deg2rad(deg) {
      return deg * (Math.PI / 180);
  }
});

// Initialize Socket.IO
const socket = io();

socket.on("connect", () => {
  console.log("Connected to server with ID: " + socket.id);
});

socket.on("receive-message", (data) => {
  console.log(data);

  // Extract latitude and longitude from the data object
  const { latitude, longitude } = data;

  // Create a marker at the specified latitude and longitude
  L.marker([latitude, longitude]).addTo(map)
      .bindPopup("You are here.")
      .openPopup();
});
