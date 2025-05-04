export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Helper: Parse cookie value.
    function getCookie(request, name) {
      const cookie = request.headers.get("Cookie");
      if (!cookie) return null;
      const match = cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
      return match ? match[2] : null;
    }

    // Helper: Retrieve username from session token stored in KV.
    async function getUserFromSession(request) {
      const sessionToken = getCookie(request, "session");
      if (!sessionToken) return null;
      const username = await env.SESSIONS.get(sessionToken);
      return username;
    }

    // ------------------------------------------------------------------
    // Route: GET "/" – Serve either the main app (if authenticated) or auth page.
    // ------------------------------------------------------------------
    if (pathname === "/" && request.method === "GET") {
      const username = await getUserFromSession(request);
      let html = "";
      if (username) {
        // Authenticated user view with dark mode toggle & responsive layout.
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Notes</title>
  <!-- Font Awesome Icons -->
  <script src="https://kit.fontawesome.com/0ca27f8db1.js" crossorigin="anonymous"></script>
  <style>
    /* Base Reset and Variables */
    * { box-sizing: border-box; }
    :root {
      --bg-color: #f4f4f9;
      --header-bg: #4a90e2;
      --header-text: #fff;
      --panel-bg: #fff;
      --panel-border: #ddd;
      --text-color: #333;
      --btn-bg: #4a90e2;
      --btn-hover: #3a78c2;
    }
    body.dark {
      --bg-color: #222;
      --header-bg: #333;
      --header-text: #fff;
      --panel-bg: #2c2c2c;
      --panel-border: #444;
      --text-color: #ddd;
      --btn-bg: #555;
      --btn-hover: #666;
    }
    body { 
      font-family: Arial, sans-serif; 
      background: var(--bg-color); 
      margin: 0; 
      padding: 0; 
      color: var(--text-color);
    }
    header { 
      background: var(--header-bg);
      color: var(--header-text);
      padding: 20px; 
      text-align: center;
      position: relative; 
    }
    /* Dark mode toggle button */
    .dark-mode-toggle {
      background: transparent;
      border: none;
      color: var(--header-text);
      font-size: 1.5rem;
      cursor: pointer;
      position: absolute;
      top: 20px;
      left: 20px;
    }
    .logout-btn {
      background: #e74c3c;
      color: #fff;
      border: none;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      position: absolute;
      top: 20px;
      right: 20px;
      transition: background 0.2s;
    }
    .logout-btn:hover { background: #c0392b; }
    main { 
      padding: 20px; 
      max-width: 1200px; 
      margin: 20px auto; 
    }
    /* Two Column Layout */
    .app-container { 
      display: flex; 
      gap: 20px; 
    }
    .notes-panel, .editor-panel {
      background: var(--panel-bg);
      padding: 15px;
      border: 1px solid var(--panel-border);
      border-radius: 4px;
    }
    .notes-panel {
      flex: 0 0 35%;
      overflow-y: auto;
      max-height: 80vh;
    }
    .editor-panel {
      flex: 1;
    }
    .notes-panel h2,
    .editor-panel h2 {
      margin-top: 0;
    }
    /* Editor Styling */
    .editor-toolbar { margin-bottom: 5px; }
    .editor-toolbar button {
      background: #fff;
      border: 1px solid #ccc;
      margin-right: 2px;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .editor-toolbar button:hover { background: #eaeaea; }
    .editor {
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 10px;
      min-height: 200px;
      background: var(--panel-bg);
    }
    .editor:empty:before { content: attr(placeholder); color: #888; }
    .editor-buttons { margin-top: 10px; }
    .save-note, #cancel-edit {
      background: var(--btn-bg);
      color: #fff;
      border: none;
      padding: 10px 15px;
      margin-right: 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .save-note:hover, #cancel-edit:hover { background: var(--btn-hover); }
    /* Notes List Styling */
    .note {
      background: var(--panel-bg);
      padding: 10px 15px;
      border: 1px solid var(--panel-border);
      margin-bottom: 10px;
      border-radius: 4px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
    }
    .note:hover { background: #fafafa; }
    body.dark .note:hover { background: #3a3a3a; }
    .note .note-text { margin: 0; }
    .note .icons {
      position: absolute;
      top: 10px;
      right: 10px;
    }
    .note .icons i {
      margin-left: 10px;
      cursor: pointer;
      color: #888;
      transition: color 0.2s;
    }
    .note .icons i:hover { color: var(--btn-bg); }
    /* Responsive: Stack columns on smaller screens */
    @media (max-width: 768px) {
      .app-container {
        flex-direction: column;
      }
      .notes-panel { max-height: none; }
    }
  </style>
</head>
<body>
  <header>
    <!-- Dark Mode Toggle Button -->
    <button class="dark-mode-toggle" onclick="toggleDarkMode()"><i class="fa-solid fa-moon"></i></button>
    <h1>Welcome, ${username}!</h1>
    <button class="logout-btn" onclick="logout()">Logout</button>
  </header>
  <main>
    <div class="app-container">
      <!-- Left Panel: Notes List -->
      <section class="notes-panel" id="notes">
        <h2>Your Notes</h2>
      </section>
      <!-- Right Panel: Rich Text Editor -->
      <section class="editor-panel">
        <h2 id="form-header">New Note</h2>
        <div class="editor-toolbar">
          <button type="button" onclick="execCmd('bold')"><b>B</b></button>
          <button type="button" onclick="execCmd('italic')"><i>I</i></button>
          <button type="button" onclick="execCmd('underline')"><u>U</u></button>
          <button type="button" onclick="execCmd('insertOrderedList')">OL</button>
          <button type="button" onclick="execCmd('insertUnorderedList')">UL</button>
        </div>
        <div id="editor" class="editor" contenteditable="true" placeholder="Write your note here..."></div>
        <div class="editor-buttons">
          <button class="save-note" onclick="saveNote()">Save Note</button>
          <button id="cancel-edit" style="display:none;" onclick="cancelEdit()">Cancel</button>
        </div>
      </section>
    </div>
  </main>
  <script>
    // Toggle dark mode by toggling the "dark" class on the body.
    function toggleDarkMode() {
      document.body.classList.toggle('dark');
      // Optionally, persist the user's theme preference in localStorage
      if(document.body.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
      } else {
        localStorage.setItem('theme', 'light');
      }
    }
    // On load, check the user's saved theme.
    if(localStorage.getItem('theme') === 'dark') {
      document.body.classList.add('dark');
    }

    // Execute rich text formatting commands.
    function execCmd(command) {
      document.execCommand(command, false, null);
    }
    let editingNoteId = null;
    async function loadNotes() {
      try {
        const response = await fetch('/notes');
        const notes = await response.json();
        const notesDiv = document.getElementById('notes');
        notesDiv.innerHTML = '<h2>Your Notes</h2>';
        notes.forEach(note => {
          const noteDiv = document.createElement('div');
          noteDiv.className = 'note';
          const noteText = document.createElement('p');
          noteText.className = 'note-text';
          noteText.innerHTML = note.text;
          noteDiv.appendChild(noteText);
          const iconsDiv = document.createElement('div');
          iconsDiv.className = 'icons';
          const iconEdit = document.createElement('i');
          iconEdit.className = 'fa-solid fa-pen-to-square';
          iconEdit.title = "Edit note";
          iconEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            editNote(note);
          });
          iconsDiv.appendChild(iconEdit);
          const iconDelete = document.createElement('i');
          iconDelete.className = 'fa-solid fa-trash';
          iconDelete.title = "Delete note";
          iconDelete.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm('Delete this note?')) {
              await fetch('/notes?id=' + note.id, { method: 'DELETE' });
              loadNotes();
            }
          });
          iconsDiv.appendChild(iconDelete);
          noteDiv.appendChild(iconsDiv);
          notesDiv.appendChild(noteDiv);
        });
      } catch (error) {
        console.error('Error fetching notes:', error);
      }
    }
    function editNote(note) {
      const editor = document.getElementById('editor');
      editor.innerHTML = note.text;
      editingNoteId = note.id;
      document.querySelector('.save-note').textContent = 'Update Note';
      document.getElementById('form-header').textContent = 'Edit Note';
      document.getElementById('cancel-edit').style.display = 'inline-block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function cancelEdit() {
      const editor = document.getElementById('editor');
      editor.innerHTML = '';
      editingNoteId = null;
      document.querySelector('.save-note').textContent = 'Save Note';
      document.getElementById('form-header').textContent = 'New Note';
      document.getElementById('cancel-edit').style.display = 'none';
    }
    async function saveNote() {
      const editor = document.getElementById('editor');
      const richText = editor.innerHTML;
      if (!richText.trim()) {
        alert('Note content is empty!');
        return;
      }
      try {
        let response;
        if (editingNoteId) {
          response = await fetch('/notes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingNoteId, text: richText })
          });
        } else {
          response = await fetch('/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: richText })
          });
        }
        const result = await response.json();
        console.log("Saved note:", result);
        editor.innerHTML = '';
        editingNoteId = null;
        document.querySelector('.save-note').textContent = 'Save Note';
        document.getElementById('form-header').textContent = 'New Note';
        document.getElementById('cancel-edit').style.display = 'none';
        loadNotes();
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
    async function logout() {
      await fetch('/logout', { method: 'POST' });
      location.reload();
    }
    loadNotes();
  </script>
</body>
</html>`;
      } else {
        // Unauthenticated view – Updated auth page with your provided code.
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In | My Notes</title>
  <script src="https://kit.fontawesome.com/0ca27f8db1.js" crossorigin="anonymous"></script>
  <style>
    /* Reset */
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
    body { background: #f4f4f9; display: flex; justify-content: center; align-items: center; height: 100vh; }
    /* Auth container */
    .auth-container {
      background: #fff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      text-align: center;
      max-width: 400px;
      width: 100%;
    }
    /* Logo */
    .logo {
      font-size: 40px;
      color: #B197FC;
      margin-bottom: 15px;
    }
    /* Headings & Text */
    .auth-container h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #333;
    }
    .auth-container p {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
    }
    /* Input groups */
    .input-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 15px;
    }
    .input-group input {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
    }
    /* Buttons */
    .auth-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 15px;
    }
    .btn {
      display: block;
      padding: 12px;
      font-size: 16px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      width: 100%;
    }
    .btn-signin {
      background: #4a90e2;
      color: white;
    }
    .btn-signin:hover {
      background: #357abd;
    }
    .btn-signup {
      background: #ddd;
      color: #333;
    }
    .btn-signup:hover {
      background: #ccc;
    }
    /* Footer */
    .auth-footer {
      margin-top: 15px;
      font-size: 14px;
    }
    .auth-footer a {
      color: #4a90e2;
      text-decoration: none;
    }
    .auth-footer a:hover {
      text-decoration: underline;
    }
    hr {
      margin: 20px 0;
      border: none;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="auth-container">
    <div class="logo">
      <i class="fa-solid fa-cloud fa-2xl" style="color: #B197FC;"></i>
    </div>
    <h1>Sign in With your FTM Cloud Account</h1>
    <p>
      <b>MBD Notes <i class="fa-solid fa-circle-check" style="color: #1185fe;"></i></b>
      Wants access your My Online database and read your Username and Password<br>
    </p>
    <!-- Sign In Form -->
    <div class="input-group">
      <input type="text" id="login-username" placeholder="Username" required>
    </div>
    <div class="input-group">
      <input type="password" id="login-password" placeholder="Password" required>
    </div>
    <div class="auth-buttons">
      <button class="btn btn-signin" id="btn-signin">Sign In</button>
    </div>
    <hr>
    <!-- Sign Up Form -->
    <div class="input-group">
      <input type="text" id="signup-username" placeholder="Username" required>
    </div>
    <div class="input-group">
      <input type="password" id="signup-password" placeholder="Password" required>
    </div>
    <div class="auth-buttons">
      <button class="btn btn-signup" id="btn-signup">Create an Account</button>
    </div>
    <div class="auth-footer">
      <i>
        <i class="fa-solid fa-circle-check" style="color: #1185fe;"></i>
        MBD Notes is an <b>Official app Developed by Funtimes Media</b>
      </i>
      <p>Forgot your password? <a href="https://mbdio.uk/ftmcloudhelp">Contact us</a></p>
    </div>
  </div>
  <script>
    // Sign In event listener.
    document.getElementById('btn-signin').onclick = async function(e) {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value.trim();
      if (!username || !password) {
        alert("Please fill in both fields");
        return;
      }
      const resp = await fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
      });
      const result = await resp.json();
      if (result.success) {
        location.reload();
      } else {
        alert(result.message);
      }
    };
    // Sign Up event listener.
    document.getElementById('btn-signup').onclick = async function(e) {
      e.preventDefault();
      const username = document.getElementById('signup-username').value.trim();
      const password = document.getElementById('signup-password').value.trim();
      if (!username || !password) {
        alert("Please fill in both fields");
        return;
      }
      const resp = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await resp.json();
      if (result.success) {
        alert("Signup successful! Please sign in.");
      } else {
        alert(result.message);
      }
    };
  </script>
</body>
</html>`;
      }
      return new Response(html, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    // ------------------------------------------------------------------
    // Route: POST "/signup" – Create a new user.
    // ------------------------------------------------------------------
    if (pathname === "/signup" && request.method === "POST") {
      const { username, password } = await request.json();
      if (!username || !password) {
        return new Response(JSON.stringify({ success: false, message: "Username and password required" }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      const existing = await env.USERS.get(username);
      if (existing) {
        return new Response(JSON.stringify({ success: false, message: "User already exists" }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      const user = { username, password }; // Note: Use password hashing in production.
      await env.USERS.put(username, JSON.stringify(user));
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // ------------------------------------------------------------------
    // Route: POST "/login" – Authenticate the user.
    // ------------------------------------------------------------------
    if (pathname === "/login" && request.method === "POST") {
      const { username, password } = await request.json();
      if (!username || !password) {
        return new Response(JSON.stringify({ success: false, message: "Username and password required" }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      const userData = await env.USERS.get(username);
      if (!userData) {
        return new Response(JSON.stringify({ success: false, message: "Invalid credentials" }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      const user = JSON.parse(userData);
      if (user.password !== password) {
        return new Response(JSON.stringify({ success: false, message: "Invalid credentials" }), {
          headers: { "Content-Type": "application/json" }
        });
      }
      const sessionToken = crypto.randomUUID();
      await env.SESSIONS.put(sessionToken, username);
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `session=${sessionToken}; HttpOnly; Path=/`
        }
      });
    }

    // ------------------------------------------------------------------
    // Route: POST "/logout" – Log out the user.
    // ------------------------------------------------------------------
    if (pathname === "/logout" && request.method === "POST") {
      const sessionToken = getCookie(request, "session");
      if (sessionToken) {
        await env.SESSIONS.delete(sessionToken);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "session=deleted; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
        }
      });
    }

    // ------------------------------------------------------------------
    // Route: "/notes" – API endpoints for notes (requires authentication)
    // ------------------------------------------------------------------
    if (pathname === "/notes") {
      const username = await getUserFromSession(request);
      if (!username) {
        return new Response(JSON.stringify({ success: false, message: "Not authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      const notesKey = `notes:${username}`;

      // GET: Return all notes.
      if (request.method === "GET") {
        const data = await env.NOTES.get(notesKey);
        const notes = data ? JSON.parse(data) : [];
        return new Response(JSON.stringify(notes), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // POST: Create a new note.
      if (request.method === "POST") {
        const { text } = await request.json();
        if (!text) {
          return new Response(JSON.stringify({ success: false, message: "Note text required" }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        const data = await env.NOTES.get(notesKey);
        const notes = data ? JSON.parse(data) : [];
        const newNote = { id: Date.now().toString(), text };
        notes.push(newNote);
        await env.NOTES.put(notesKey, JSON.stringify(notes));
        return new Response(JSON.stringify(newNote), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // DELETE: Remove a note by its ID.
      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        const data = await env.NOTES.get(notesKey);
        let notes = data ? JSON.parse(data) : [];
        notes = notes.filter(note => note.id !== id);
        await env.NOTES.put(notesKey, JSON.stringify(notes));
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // PUT: Update an existing note.
      if (request.method === "PUT") {
        const { id, text } = await request.json();
        if (!id || !text) {
          return new Response(JSON.stringify({ success: false, message: "Id and text required" }), {
            headers: { "Content-Type": "application/json" }
          });
        }
        const data = await env.NOTES.get(notesKey);
        let notes = data ? JSON.parse(data) : [];
        notes = notes.map(note => note.id === id ? { ...note, text } : note);
        await env.NOTES.put(notesKey, JSON.stringify(notes));
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // ------------------------------------------------------------------
    // Fallback: 404 Not Found.
    // ------------------------------------------------------------------
    return new Response("Not Found", { status: 404 });
  }
};
