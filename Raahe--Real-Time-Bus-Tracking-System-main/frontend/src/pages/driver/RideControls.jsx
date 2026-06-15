// import React, { useState } from "react";

// export function RideControls() {
//   const [rideStatus, setRideStatus] = useState("Not Started");

//   const startRide = () => setRideStatus("Ongoing");
//   const endRide = () => setRideStatus("Completed");

//   return (
//     <div className="p-4 border rounded bg-gray-50 shadow-sm">
//       <h3 className="text-lg font-semibold mb-2">Ride Controls</h3>
//       <p className="mb-4">Current Ride Status: <span className="font-bold">{rideStatus}</span></p>
      
//       <div className="flex gap-3">
//         <button
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
//           onClick={startRide}
//         >
//           Start Ride
//         </button>
//         <button
//           className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
//           onClick={endRide}
//         >
//           End Ride
//         </button>
//       </div>
//     </div>
//   );
// }
