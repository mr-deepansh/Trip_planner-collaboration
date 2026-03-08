import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axiosConfig";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Plus,
  Clock,
  MapPin,
  Coffee,
  Bed,
  Plane,
  UserPlus,
} from "lucide-react";

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState("");
  const [activityForm, setActivityForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    type: "OTHER",
  });

  // Collaborate state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("VIEWER");

  useEffect(() => {
    const loadTrip = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/trips/${tripId}`);
        setTrip(res.data.data);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load trip");
      } finally {
        setLoading(false);
      }
    };
    loadTrip();
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      const res = await api.get(`/trips/${tripId}`);
      setTrip(res.data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load trip");
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/trips/${tripId}/activities`, {
        dayId: selectedDayId,
        ...activityForm,
      });
      setShowActivityModal(false);
      setActivityForm({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        type: "OTHER",
      });
      fetchTripDetails();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add activity");
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/trips/${tripId}/members`, {
        email: memberEmail,
        role: memberRole,
      });
      alert("Member added successfully!");
      setShowMemberModal(false);
      setMemberEmail("");
      setMemberRole("VIEWER");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add member");
    }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Are you sure you want to delete this activity?"))
      return;
    try {
      await api.delete(`/trips/${tripId}/activities/${activityId}`);
      fetchTripDetails();
    } catch {
      alert("Failed to delete activity");
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "FLIGHT":
        return <Plane className="w-5 h-5 text-blue-500" />;
      case "HOTEL":
        return <Bed className="w-5 h-5 text-indigo-500" />;
      case "FOOD":
        return <Coffee className="w-5 h-5 text-orange-500" />;
      case "SIGHTSEEING":
        return <MapPin className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (error)
    return <div className="text-center py-20 text-red-500">{error}</div>;
  if (!trip) return null;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 break-words">
            {trip.title}
          </h1>
          <p className="text-base sm:text-lg text-gray-500">
            {format(parseISO(trip.start_date), "MMMM d, yyyy")} —{" "}
            {format(parseISO(trip.end_date), "MMMM d, yyyy")}
          </p>
        </div>
        <div className="w-full sm:w-auto mt-2 sm:mt-0">
          <button
            onClick={() => setShowMemberModal(true)}
            className="flex w-full sm:w-auto justify-center items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition shadow-sm border border-indigo-100"
          >
            <UserPlus className="w-5 h-5" />
            Collaborate
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {trip.Days?.map((day, index) => (
          <div
            key={day.id}
            className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 px-4 sm:px-6 py-4 flex flex-row items-center justify-between gap-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Day {index + 1}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(parseISO(day.date), "EEEE, MMMM d, yyyy")}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedDayId(day.id);
                  setShowActivityModal(true);
                }}
                className="text-primary-600 hover:text-primary-700 bg-primary-50 p-2 rounded-full hover:bg-primary-100 transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {(day.Activities || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center italic py-4">
                  No activities planned for this day yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {(day.Activities || [])
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-4 p-4 rounded-lg border border-gray-100 hover:border-primary-200 hover:shadow-sm transition group bg-white"
                      >
                        <div className="shrink-0 mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-base font-semibold text-gray-900 break-words">
                              {activity.title}
                            </h4>
                            <div className="flex gap-2 sm:opacity-0 group-hover:opacity-100 transition shrink-0">
                              <button
                                onClick={() =>
                                  handleDeleteActivity(activity.id)
                                }
                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-500">
                            {activity.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {activity.start_time}{" "}
                                {activity.end_time && `- ${activity.end_time}`}
                              </span>
                            )}
                          </div>
                          {activity.description && (
                            <p className="mt-2 text-sm text-gray-600 font-medium">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                Add Activity
              </h2>
              <form onSubmit={handleAddActivity} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    required
                    type="text"
                    value={activityForm.title}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="e.g. Visit Eiffel Tower"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={activityForm.start_time}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          start_time: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={activityForm.end_time}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          end_time: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={activityForm.type}
                    onChange={(e) =>
                      setActivityForm({ ...activityForm, type: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="FLIGHT">Flight</option>
                    <option value="HOTEL">Hotel</option>
                    <option value="FOOD">Food</option>
                    <option value="SIGHTSEEING">Sightseeing</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={activityForm.description}
                    onChange={(e) =>
                      setActivityForm({
                        ...activityForm,
                        description: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
                    rows="3"
                    placeholder="Optional notes..."
                  ></textarea>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowActivityModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded shadow"
                  >
                    Save Activity
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Collaborate Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-indigo-500" />
                Invite to Trip
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your friend's email address to collaborate on this
                itinerary together.
              </p>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    required
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="friend@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role & Permissions
                  </label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="VIEWER">
                      Viewer (Can only see trip details)
                    </option>
                    <option value="EDITOR">
                      Editor (Can add and edit activities)
                    </option>
                  </select>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowMemberModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow flex items-center gap-2"
                  >
                    Send Invite
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

export default TripDetail;
