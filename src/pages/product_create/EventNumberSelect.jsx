import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Search, Loader2 } from "lucide-react";
import $api from "../../http/api";

const EventNumberSelect = ({ formData, setFormData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  // Event number formatlovchi funksiya
  const formatEventNumber = (eventNumber, date) => {
    if (!date) return eventNumber;

    try {
      const year = new Date(date).getFullYear();
      const yearShort = year.toString().slice(-2); // Oxirgi 2 raqamni oladi
      return `${eventNumber}/${yearShort}`;
    } catch (error) {
      return eventNumber; // Agar date noto'g'ri bo'lsa, original event_number ni qaytaradi
    }
  };

  const fetchEvents = useCallback(
    async (pageNum = 1, search = "", append = false) => {
      setLoading(true);
      setErrorMessage("");
      try {
        let endpoint = "/bojxona/events";
        let params = {};

        if (search) {
          endpoint = "/bojxona/events/search";
          params = { search };
        } else {
          params = {
            page: pageNum,
            limit: 10,
          };
        }

        let response;
        try {
          response = await $api.get(endpoint, { params });
        } catch (primaryError) {
          if (!search && primaryError?.response?.status === 500) {
            response = await $api.get("/bojxona/events");
          } else {
            throw primaryError;
          }
        }

        const data = response?.data || {};

        if (data && data.events) {
          const newEvents = data.events.map((event) => ({
            id: event.id,
            event_number: event.event_number,
            formatted_event_number: formatEventNumber(
              event.event_number,
              event.date
            ), // Formatlanganini qo'shamiz
            offender_full_name: event.offender_full_name,
            date: event.date,
            shipperName: event.shipperName,
            productsCount: event.productsCount,
          }));

          if (append) {
            setEvents((prev) => [...prev, ...newEvents]);
          } else {
            setEvents(newEvents);
          }

          setTotalPages(data.totalPages || 0);
          setHasMore(pageNum < (data.totalPages || 0));
        } else {
          if (!append) {
            setEvents([]);
          }
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        setErrorMessage(
          error?.response?.data?.message ||
            "Eventlar vaqtincha yuklanmadi. Qayta urinib ko'ring."
        );
        if (!append) {
          setEvents([]);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchEvents(1, searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchEvents]);

  const handleScroll = useCallback(
    (e) => {
      const { scrollTop, scrollHeight, clientHeight } = e.target;

      if (scrollHeight - scrollTop === clientHeight && hasMore && !loading) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchEvents(nextPage, searchTerm, true);
      }
    },
    [hasMore, loading, page, searchTerm, fetchEvents]
  );

  useEffect(() => {
    if (formData?.event_id && !selectedEvent) {
      const foundEvent = events.find((event) => event.id === formData.event_id);
      if (foundEvent) {
        setSelectedEvent(foundEvent);
      } else if (formData.event_number) {
        const eventFromFormData = {
          id: formData.event_id,
          event_number: formData.event_number,
          formatted_event_number: formatEventNumber(
            formData.event_number,
            formData.event_date
          ),
          date: formData.event_date,
        };
        setSelectedEvent(eventFromFormData);
      }
    }
  }, [formData?.event_id, formData?.event_number, events, selectedEvent]);

  useEffect(() => {
    if (!formData?.event_id) {
      setSelectedEvent(null);
    }
  }, [formData?.event_id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleEventSelect = (event) => {
    setFormData({
      ...formData,
      event_id: event.id,
      event_number: event.event_number,
      formatted_event_number: event.formatted_event_number, // Formatlanganini ham saqlaymiz
      selectedEvent: event,
    });
    setSelectedEvent(event);
    setIsOpen(false);
    setSearchTerm("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("uz-UZ");
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Event tanlang
        </label>
        <div className="relative w-full flex gap-2" ref={dropdownRef}>
          <span className="text-xs text-gray-500 w-12 mt-1 ">Event number</span>
          <div
            className="w-full border-2 border-gray-300 bg-white px-2  text-sm outline-none focus:border-green-500 cursor-pointer flex items-center justify-between hover:border-gray-400 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className={selectedEvent ? "text-gray-900" : "text-gray-400"}>
              {selectedEvent
                ? selectedEvent.formatted_event_number
                : "Event tanlang"}
            </span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {isOpen && (
            <div className="absolute top-full left-13 right-0 bg-white border-2 border-gray-300 border-t-0 z-50 max-h-96 shadow-lg">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                    placeholder="Event raqami yoki ism bo'yicha qidiring..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {errorMessage && (
                  <div className="mt-2 text-xs text-red-600">{errorMessage}</div>
                )}
              </div>

              <div
                ref={listRef}
                className="max-h-72 overflow-y-auto"
                onScroll={handleScroll}
              >
                {events.length > 0 ? (
                  <>
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                        onClick={() => handleEventSelect(event)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibol">
                                {event.formatted_event_number}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end text-xs text-gray-500 ml-3">
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              {event.productsCount} mahsulot
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="p-4 text-center border-t border-gray-100">
                        <Loader2
                          size={20}
                          className="animate-spin mx-auto text-blue-500"
                        />
                        <div className="text-sm text-gray-500 mt-2">
                          Ko'proq eventlar yuklanmoqda...
                        </div>
                      </div>
                    )}

                    {!hasMore && events.length > 0 && (
                      <div className="p-3 text-center text-xs text-gray-500 bg-gray-50">
                        Barcha eventlar ko'rsatildi
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center">
                    {loading ? (
                      <div>
                        <Loader2
                          size={20}
                          className="animate-spin mx-auto text-blue-500"
                        />
                        <div className="text-sm text-gray-500 mt-2">
                          Eventlar yuklanmoqda...
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        {searchTerm
                          ? `"${searchTerm}" bo'yicha hech narsa topilmadi`
                          : "Eventlar mavjud emas"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* {selectedEvent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-green-800 mb-2">
            Tanlangan Event Ma'lumotlari:
          </h4>
          <div className="space-y-1 text-xs text-green-700">
            <div>
              <strong>Event ID:</strong> {selectedEvent.id}
            </div>
            <div>
              <strong>Event Raqami:</strong> #{selectedEvent.formatted_event_number}
              <strong>Mahsulotlar soni:</strong> {selectedEvent.productsCount}
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default EventNumberSelect;
