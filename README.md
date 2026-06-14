# 🤖 NexBot — AI Chatbot Web Application

> A full-stack conversational AI web app built with Python, Flask, and the Gemini API — featuring a ChatGPT-style interface, real-time AI responses, and persistent browser-side chat history.

## ✨ Features

- 💬 **ChatGPT-style UI** — clean message bubbles, avatars, timestamps, and animated typing indicator
- ⚡ **Real-time AI responses** — powered by the Gemini API via Flask REST backend
- 🗂️ **Persistent chat history** — sessions saved in browser `localStorage`, survive page reloads
- 📁 **Session management** — create new chats, switch between past conversations, delete sessions from the sidebar
- 🌙 **Dark / Light mode** — toggle with one click
- 📱 **Fully responsive** — works on desktop and mobile
- 🔤 **Markdown rendering** — bot replies support bold, code blocks, and lists
- 🔁 **Conversation context** — full message history is sent to the backend on every request so the AI maintains context

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, Flask |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| AI / LLM | Google Gemini API |
| Communication | Fetch API (async POST/GET) |
| Storage | Browser `localStorage` |
| Version Control | Git & GitHub |

---

## 📁 Project Structure

```
nexbot/
│
├── app.py                  # Flask app — main entry point
├── requirements.txt        # Python dependencies
├── .env                    # API keys (not committed)
├── .gitignore
│
├── static/
│   ├── style.css           # All styling & theme variables
│   └── script.js           # Frontend logic, API calls, localStorage
│
└── templates/
    └── index.html          # Main HTML page
```

---

Each session stores its full message list. When you open a past chat, the JS reads from `localStorage` and re-renders all messages instantly.

> **Note:** History is tied to the browser and device. Clearing browser data will erase all sessions. A future version may migrate this to a server-side database (SQLAlchemy + SQLite).

---

## 🚀 Future Improvements

- [ ] Migrate chat history to a server-side database (SQLAlchemy + SQLite / PostgreSQL)
- [ ] Add user authentication (Flask-Login)
- [ ] Support file/image uploads
- [ ] Export chat as PDF or text
- [ ] Deploy to cloud (Render / Railway / AWS)
- [ ] Stream AI responses token by token (SSE / WebSocket)

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.


> ⭐ If you found this project helpful, consider giving it a star — it really helps!
