import React, { useEffect, useState } from "react";
import api from "../api/axiosConfig";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Calendar, Plus } from "lucide-react";

const Dashboard = () => {
  const [trips, setTrips] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // New Trip Form
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchTrips = async () => {
    try {
      const res = await api.get("/trips");
      setTrips(res.data.data);
    } catch {
      console.error("Failed to fetch trips");
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      await api.post("/trips", {
        title,
        start_date: startDate,
        end_date: endDate,
      });
      setShowModal(false);
      fetchTrips();
      setTitle("");
      setStartDate("");
      setEndDate("");
    } catch {
      alert("Failed to create trip");
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Your Trips
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex w-full sm:w-auto justify-center items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition shadow-md"
        >
          <Plus className="w-5 h-5" />
          New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No trips yet
          </h3>
          <p>Create your first trip to start planning your next adventure.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Link
              to={`/trips/${trip.id}`}
              key={trip.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition group block"
            >
              <h2 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition mb-2">
                {trip.title}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(trip.start_date), "MMM d, yyyy")} -{" "}
                  {format(new Date(trip.end_date), "MMM d, yyyy")}
                </span>
              </div>
              <div className="mt-4 inline-block bg-primary-100 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                Role: {trip.TripMember?.role || "VIEWER"}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Trip Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Plan a new trip</h2>
              <form onSubmit={handleCreateTrip} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trip Name
                  </label>
                  <input
                    required
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g. Summer in Paris"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    required
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    required
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded shadow"
                  >
                    Create Trip
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
