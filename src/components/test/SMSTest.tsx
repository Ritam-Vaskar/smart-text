import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface TwilioInfo {
  accountSid: string;
  friendlyName: string;
  status: string;
  type: string;
  configuredPhone: string;
}

export default function SMSTest() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('Hello! This is a test SMS from your campaign system.');
  const [loading, setLoading] = useState(false);
  const [twilioInfo, setTwilioInfo] = useState<TwilioInfo | null>(null);

  const testSMS = async () => {
    if (!phoneNumber.trim() || !message.trim()) {
      toast.error('Please enter both phone number and message');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/test/twilio-test', {
        phoneNumber: phoneNumber.trim(),
        message: message.trim()
      });

      toast.success('SMS sent successfully!');
      console.log('SMS Result:', response.data);
    } catch (error: any) {
      console.error('SMS Test Error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      toast.error(`SMS Failed: ${errorMessage}`);
    }
    setLoading(false);
  };

  const getTwilioInfo = async () => {
    try {
      const response = await axios.get('/test/twilio-info');
      setTwilioInfo(response.data);
      toast.success('Twilio info loaded');
    } catch (error: any) {
      console.error('Twilio Info Error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      toast.error(`Failed to get Twilio info: ${errorMessage}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">SMS Test Interface</h2>
      
      <div className="space-y-6">
        {/* Twilio Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">Twilio Configuration</h3>
          <button
            onClick={getTwilioInfo}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Check Twilio Info
          </button>
          
          {twilioInfo && (
            <div className="mt-3 text-sm space-y-1">
              <p><strong>Account SID:</strong> {twilioInfo.accountSid}</p>
              <p><strong>Account Name:</strong> {twilioInfo.friendlyName}</p>
              <p><strong>Status:</strong> {twilioInfo.status}</p>
              <p><strong>Type:</strong> {twilioInfo.type}</p>
              <p><strong>Configured Phone:</strong> {twilioInfo.configuredPhone}</p>
            </div>
          )}
        </div>

        {/* Test SMS */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800">Test SMS</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (with country code)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Include country code (e.g., +1 for US)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={160}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length}/160 characters
              </p>
            </div>

            <button
              onClick={testSMS}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Test SMS'}
            </button>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Troubleshooting</h3>
          <div className="text-sm text-yellow-700 space-y-2">
            <p><strong>Common Issues:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Account SID should start with 'AC' not 'SK'</li>
              <li>Phone number must include country code (+1 for US)</li>
              <li>Twilio phone number must be verified and active</li>
              <li>Check Twilio console for detailed error logs</li>
              <li>Ensure your Twilio account has SMS credits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}