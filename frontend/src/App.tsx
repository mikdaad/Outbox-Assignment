// src/App.tsx

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// Define the structure of an email object, making properties optional
interface Email {
  subject?: string;
  from?: { text: string };
  date?: string;
  text?: string;
  category?: string;
  accountId?: string;
}


function App() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');

  // Function to fetch emails from the backend API
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/emails`, {
        params: {
          q: searchTerm,
          category: categoryFilter,
          accountId: accountFilter,
        },
      });
      // FIX: Ensure the response data is an array before setting it
      if (Array.isArray(response.data)) {
        setEmails(response.data);
      } else {
        console.error("API did not return an array:", response.data);
        setEmails([]); // Default to an empty array on unexpected response
      }
    } catch (err) {
      setError('Failed to fetch emails. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, accountFilter]);

  // Fetch emails on initial load and when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchEmails();
    }, 500); // Debounce API calls to prevent rapid firing
    return () => clearTimeout(timer);
  }, [fetchEmails]);

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'Interested': return 'bg-green-200 text-green-800';
      case 'Meeting Booked': return 'bg-blue-200 text-blue-800';
      case 'Not Interested': return 'bg-red-200 text-red-800';
      case 'Out of Office': return 'bg-yellow-200 text-yellow-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Onebox</h1>
          <p className="text-gray-600">Your unified and intelligent email inbox.</p>
        </header>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 border rounded-md w-full focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border rounded-md w-full focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Interested">Interested</option>
            <option value="Meeting Booked">Meeting Booked</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Out of Office">Out of Office</option>
            <option value="Uncategorized">Uncategorized</option>
          </select>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="p-2 border rounded-md w-full focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Accounts</option>
            {/* FIX: Use placeholder values since env vars aren't available here */}
            <option value="your_email_1@gmail.com">Account 1 (Gmail)</option>
            <option value="your_email_2@outlook.com">Account 2 (Outlook)</option>
          </select>
        </div>

        {/* Email List */}
        <main>
          {loading && <p className="text-center text-gray-500">Loading emails...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}
          {!loading && !error && (
            <div className="space-y-4">
              {emails.length > 0 ? (
                emails.map((email, index) => (
                  // FIX: Use a more reliable key and check if email object exists
                  email ? (
                    <div key={`${email.date}-${index}`} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                          <h2 className="font-bold text-lg text-gray-900">{email.subject || 'No Subject'}</h2>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(email.category)}`}>
                              {email.category || 'Uncategorized'}
                          </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">From: {email.from?.text || 'No Sender'}</p>
                      <p className="text-xs text-gray-500 mb-4">Account: {email.accountId || 'N/A'} | Date: {email.date ? new Date(email.date).toLocaleString() : 'No Date'}</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{(email.text || 'This email has no text content.').substring(0, 300)}...</p>
                    </div>
                  ) : null // Don't render anything if the email object is null/undefined
                ))
              ) : (
                <p className="text-center text-gray-500">No emails found.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
