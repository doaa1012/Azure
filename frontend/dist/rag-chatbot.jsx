document.addEventListener('DOMContentLoaded', () => {
  const chatbotContainer = document.getElementById('rag-chatbot');

  // Poll for token availability
  const interval = setInterval(() => {
    const token = localStorage.getItem('authToken');

    if (token) {
      clearInterval(interval);

      const iframe = document.createElement('iframe');
      iframe.src = `/chatbot?token=${encodeURIComponent(token)}`;
      iframe.style.width = "400px";
      iframe.style.height = "600px";
      iframe.style.position = "fixed";
      iframe.style.bottom = "20px";
      iframe.style.right = "20px";
      iframe.style.border = "2px solid #007BFF";
      iframe.style.borderRadius = "15px";
      iframe.style.zIndex = "9999";
      iframe.style.backgroundColor = "#fff";
      iframe.style.boxShadow = "0 0 20px rgba(0, 0, 0, 0.7)";
      iframe.style.overflow = "visible";
      iframe.style.opacity = "1";

      iframe.onload = () => console.log('✅ Chatbot iframe loaded with token.');
      iframe.onerror = () => console.error('❌ Failed to load chatbot iframe.');

      chatbotContainer.appendChild(iframe);
    }
  }, 500);
});


