import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-800 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Harmony Matcher 🏠
        </h1>
        <p className="text-gray-600 mb-6">
          Welcome to the Harmony networking platform! This is a simplified version to test if the page loads.
        </p>
        <div className="space-y-3">
          <Link
            to="/admin"
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Admin Dashboard
          </Link>
          <button
            onClick={() => alert('Harmony Matcher is working! 🎉')}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
