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

    // Helper: Retrieve username from session token.
    async function getUserFromSession(request) {
      const sessionToken = getCookie(request, "session");
      if (!sessionToken) return null;
      const username = await env.SESSIONS.get(sessionToken);
      return username;
    }

    // ------------------------------------------------------------------
    // Route: GET "/" – Serve the main HTML page.
    // ------------------------------------------------------------------
    if (pathname === "/" && request.method === "GET") {
      const username = await getUserFromSession(request);
      let html = "";
      if (username) {
        // Authenticated user – render a two-column web app layout.
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>My Notes</title>
  <!-- Font Awesome icons -->
  <script src="https://kit.fontawesome.com/0ca27f8db1.js" crossorigin="anonymous"></script>
  <style>
    /* Reset and basic styling */
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f4f4f9; margin: 0; padding: 0; }
    header { background: #4a90e2; color: #fff; padding: 20px; text-align: center; position: relative; }
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
    main { padding: 20px; max-width: 1200px; margin: 20px auto; }
    /* Two column app layout */
    .app-container { display: flex; gap: 20px; }
    .notes-panel { flex: 0 0 35%; background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 4px; overflow-y: auto; max-height: 80vh; }
    .editor-panel { flex: 1; background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 4px; }
    .notes-panel h2, .editor-panel h2 { margin-top: 0; }
    /* Editor styling */
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
      background: #fff;
    }
    .editor:empty:before { content: attr(placeholder); color: #888; }
    .editor-buttons { margin-top: 10px; }
    .save-note, #cancel-edit {
      background: #4a90e2;
      color: #fff;
      border: none;
      padding: 10px 15px;
      margin-right: 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .save-note:hover, #cancel-edit:hover { background: #3a78c2; }
    /* Note styling in left panel */
    .note {
      background: #fff;
      padding: 10px 15px;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      border-radius: 4px;
      position: relative;
      cursor: pointer;
      transition: background 0.2s;
    }
    .note:hover { background: #fafafa; }
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
    .note .icons i:hover { color: #4a90e2; }
  </style>
</head>
<body>
  <header>
    <h1>Welcome, ${username}!</h1>
    <button class="logout-btn" onclick="logout()">Logout</button>
  </header>
  <main>
    <div class="app-container">
      <!-- Left Panel: Notes List -->
      <section class="notes-panel" id="notes">
        <h2>Your Notes</h2>
        <!-- Notes will be dynamically injected here -->
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
    <p>&copy; 2024-2028 Made by Danny UK <i>A Funtimes Media Company</i><br><a href="">View Open Source Code</p>
  </main>
  <script>
    // Rich text command execution.
    function execCmd(command) {
      document.execCommand(command, false, null);
    }

    // Global variable to track the note ID if editing.
    let editingNoteId = null;

    // Load notes from the API.
    async function loadNotes() {
      try {
        const resp = await fetch('/notes');
        const notes = await resp.json();
        const notesDiv = document.getElementById('notes');
        notesDiv.innerHTML = '<h2>Your Notes</h2>';
        notes.forEach(note => {
          const noteDiv = document.createElement('div');
          noteDiv.className = 'note';

          // Note text container.
          const noteText = document.createElement('p');
          noteText.className = 'note-text';
          noteText.innerHTML = note.text;
          noteDiv.appendChild(noteText);

          // Container for edit and delete icons.
          const iconsDiv = document.createElement('div');
          iconsDiv.className = 'icons';

          // Edit icon.
          const iconEdit = document.createElement('i');
          iconEdit.className = 'fa-solid fa-pen-to-square';
          iconEdit.title = "Edit note";
          iconEdit.addEventListener('click', (e) => {
            e.stopPropagation();
            editNote(note);
          });
          iconsDiv.appendChild(iconEdit);

          // Delete icon.
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

    // Populate editor to edit a note.
    function editNote(note) {
      const editor = document.getElementById('editor');
      editor.innerHTML = note.text;
      editingNoteId = note.id;
      document.querySelector('.save-note').textContent = 'Update Note';
      document.getElementById('form-header').textContent = 'Edit Note';
      document.getElementById('cancel-edit').style.display = 'inline-block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Cancel editing mode.
    function cancelEdit() {
      const editor = document.getElementById('editor');
      editor.innerHTML = '';
      editingNoteId = null;
      document.querySelector('.save-note').textContent = 'Save Note';
      document.getElementById('form-header').textContent = 'New Note';
      document.getElementById('cancel-edit').style.display = 'none';
    }

    // Save a new note or update the existing one.
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

    // Log out the user.
    async function logout() {
      await fetch('/logout', { method: 'POST' });
      location.reload();
    }

    // Load notes when the page is loaded.
    loadNotes();
  </script>
</body>
</html>`;
      } else {
        // Unauthenticated user – show sign in and sign up forms.
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Sign In / Sign Up</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f9; padding: 20px; }
    form { background: #fff; padding: 15px; border: 1px solid #ddd; margin-bottom: 20px; border-radius: 4px; }
    input { display: block; width: 95%; padding: 8px; margin: 10px auto; border: 1px solid #ccc; border-radius: 4px; }
    button { background: #4a90e2; color: #fff; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; }
    button:hover { background: #3a78c2; }
  </style>
</head>
<body>
  <h1>Sign In / Sign Up</h1>
  <div>
    <h2>Sign Up</h2>
    <form id="signup-form">
      <input type="text" id="signup-username" placeholder="Username" required />
      <input type="password" id="signup-password" placeholder="Password" required />
      <button type="submit">Sign Up</button>
    </form>
  </div>
  <div>
    <h2>Login</h2>
    <form id="login-form">
      <input type="text" id="login-username" placeholder="Username" required />
      <input type="password" id="login-password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  </div>
  <script>
    document.getElementById('signup-form').onsubmit = async function(e) {
      e.preventDefault();
      const username = document.getElementById('signup-username').value;
      const password = document.getElementById('signup-password').value;
      const resp = await fetch('/signup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
      });
      const result = await resp.json();
      if(result.success) {
         alert('Signup successful! Please log in.');
         location.reload();
      } else {
         alert(result.message);
      }
    };
    
    document.getElementById('login-form').onsubmit = async function(e) {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      const resp = await fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
      });
      const result = await resp.json();
      if(result.success) {
         location.reload();
      } else {
         alert(result.message);
      }
    };
  </script>
</body>
</html>`;
      }
      return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // ------------------------------------------------------------------
    // Route: POST "/signup" – Create a new user.
    // ------------------------------------------------------------------
    if (pathname === "/signup" && request.method === "POST") {
      const { username, password } = await request.json();
      if (!username || !password) {
        return new Response(
          JSON.stringify({ success: false, message: "Username and password required" }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      const existing = await env.USERS.get(username);
      if (existing) {
        return new Response(
          JSON.stringify({ success: false, message: "User already exists" }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      const user = { username, password };
      await env.USERS.put(username, JSON.stringify(user));
      return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
    }

    // ------------------------------------------------------------------
    // Route: POST "/login" – Authenticate the user.
    // ------------------------------------------------------------------
    if (pathname === "/login" && request.method === "POST") {
      const { username, password } = await request.json();
      if (!username || !password) {
        return new Response(
          JSON.stringify({ success: false, message: "Username and password required" }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      const userData = await env.USERS.get(username);
      if (!userData) {
        return new Response(
          JSON.stringify({ success: false, message: "Invalid credentials" }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      const user = JSON.parse(userData);
      if (user.password !== password) {
        return new Response(
          JSON.stringify({ success: false, message: "Invalid credentials" }),
          { headers: { "Content-Type": "application/json" } }
        );
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
          "Set-Cookie": `session=deleted; HttpOnly; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
        }
      });
    }

    // ------------------------------------------------------------------
    // Route: "/notes" – API endpoints for notes (requires authentication)
    // ------------------------------------------------------------------
    if (pathname === "/notes") {
      const username = await getUserFromSession(request);
      if (!username) {
        return new Response(
          JSON.stringify({ success: false, message: "Not authenticated" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
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

      // DELETE: Remove a note by its id.
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
