document.addEventListener('DOMContentLoaded', () => {

const para=document.querySelector("p")
const showGeofenceBtn = document.querySelector('#showGeofenceBtn'); 
// const p = document.querySelector('p');
// const stop = document.querySelector('#stop');

var map = L.map('map').setView([51.505, -0.09], 15);
let mylat=0;
let mylong=0;

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let geofenceCircle = null; 
let userMarker = null; 
let isInsideGeofence = false; 

let trackingInterval;
const geofenceLat = 19.07448;
const geofenceLng = 72.8812857;
const geofenceRadius = 500;
const marker = L.marker([51.505, -0.09]).addTo(map);
//to show geocircle on map
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

// if (btnn) {
document.getElementById('btnn').addEventListener('click', () => {
  if (navigator.geolocation) {
      setInterval(() => {
          navigator.geolocation.getCurrentPosition(position => {
              const { latitude, longitude } = position.coords;
              if(latitude!=mylat || longitude!=mylong){
                callapi(latitude,longitude)

              }
              
          });
      }, 5000);
      // showGeofenceCircle();
  } else {
      alert('old browseer pls use new one.');
  }
});

function callapi(latitude,longitude){
  mylat= latitude;
  mylong=longitude;
  map.setView([latitude, longitude], 16);
              marker.setLatLng([latitude, longitude]);
              axios.post('/geo/data', { latitude, longitude })
                  .then( (response)=> {
                     para.innerHTML="";
      para.innerHTML=`<p>${response.data.message}</p>`
                    console.log(response.data)
                  })
                  .catch(error => console.error(error));
}
if(showGeofenceBtn){
 
  showGeofenceBtn.addEventListener('click', () => {
    // showGeofenceCircle();
    alert('CHocho')
  });
}
 

// stop.addEventListener('click',()=>{
//   stopTracking();
// })



const success = (pos) => {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  console.log('Your current Location:')
  console.log(`latitude: ${lat}`);
  console.log(`longitude: ${lng}`);
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



  //api fetch

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










//check if the user is inside the fence or outside
const checkGeofenceStatus = (userLocation) => {
  const distance = getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, geofenceLat, geofenceLng);
  return distance <= geofenceRadius;
};
 
//calculations
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1); 
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

});