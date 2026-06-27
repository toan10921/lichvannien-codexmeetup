import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [status, setStatus] = useState('Đang kiểm tra...');

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.message || 'OK'))
      .catch(() => setStatus('Không kết nối được backend'));
  }, []);

  return (
    <main className="app">
      <h1>Lịch Vạn Niên AI</h1>
      <p>Ứng dụng lịch âm dương với chatbot tư vấn theo ngữ cảnh ngày.</p>
      <div className="status-card">
        <span className="status-label">Trạng thái backend</span>
        <strong>{status}</strong>
      </div>
    </main>
  );
}

export default App;
