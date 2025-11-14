(function(){
  const $ = (sel) => document.querySelector(sel);
  const postList = $('#postList');
  const dateInput = $('#date');

  const today = new Date();
  dateInput.valueAsDate = today;

  function slugify(str){
    return (str || 'untitled').toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,60);
  }
  function esc(s){ return (s||'').replace(/[&<>]/g, (c)=> ({'&':'&','<':'&lt;','>':'&gt;'}[c])); }
  function paragraphs(text){
    const t = (text||'').trim();
    if (!t) return '<p></p>';
    return t.split(/\n{2,}/).map(block => {
      const lines = block.split(/\n/).map(x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')).join('<br>');
      return `<p>${lines}</p>`;
    }).join('\n');
  }
  function buildTags(tagsStr){
    const tags = (tagsStr||'').split(',').map(t=>t.trim()).filter(Boolean);
    return tags.map(t=>`<a href="#" class="tag">${t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</a>`).join('');
  }
  function humanDate(iso){
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function postTemplate({title, desc, dateISO, dateHuman, tagsHTML, bodyHTML}){
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')} — Michael’s Journal</title>
  <meta name="description" content="${desc.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" />
  <link rel="stylesheet" href="../styles.css" />
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
</head>
<body>
  <a class="skip-link" href="#content">Skip to content</a>
  <header class="site-header">
    <h1><a href="../index.html" style="text-decoration:none;color:inherit;">Michael’s Journal</a></h1>
    <nav class="site-nav" aria-label="Primary">
      <a href="../index.html">Home</a>
      <a href="../about.html">About</a>
      <button class="mode-toggle" aria-pressed="false" id="modeToggle" aria-label="Toggle dark mode">🌓</button>
    </nav>
  </header>
  <main id="content" class="container">
    <article class="prose" itemscope itemtype="https://schema.org/BlogPosting">
      <header>
        <h1 itemprop="headline">${title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</h1>
        <p class="post-meta">
          <time datetime="${dateISO}" itemprop="datePublished" class="post-date">${dateHuman}</time>
          <span class="post-tags">${tagsHTML}</span>
        </p>
      </header>
      <section itemprop="articleBody">
        ${bodyHTML}
      </section>
    </article>
  </main>
  <footer class="site-footer">
    <p>&copy; <span id="year"></span> Michael Tidrow.</p>
  </footer>
  <script>
    const toggle = document.getElementById('modeToggle');
    const saved = localStorage.getItem('color-scheme');
    if (saved) document.documentElement.dataset.theme = saved;
    toggle.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = current;
      localStorage.setItem('color-scheme', current);
    });
    document.getElementById('year').textContent = new Date().getFullYear();
  </script>
</body>
</html>`;
  }
  function buildPost(){
    const title = document.getElementById('title').value.trim() || 'Untitled';
    const date = document.getElementById('date').value || new Date().toISOString().slice(0,10);
    const tags = document.getElementById('tags').value;
    const body = document.getElementById('body').value;

    const dateISO = date;
    const dateHuman = humanDate(date);
    const tagsHTML = buildTags(tags);
    const bodyHTML = paragraphs(body);
    const desc = body.split(/\n/)[0]?.slice(0,140) || 'Journal entry';

    const slug = slugify(title);
    const filename = `${dateISO}-${slug}.html`;
    const html = postTemplate({title, desc, dateISO, dateHuman, tagsHTML, bodyHTML});
    return { filename, dateISO, dateHuman, title, tagsHTML, html };
  }
  function appendToList({dateISO, dateHuman, title, tagsHTML, filename}){
    const li = document.createElement('li');
    li.className = 'post-list-item';
    const tEsc = title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    li.innerHTML = `
      <time datetime="${dateISO}" class="post-date">${dateHuman}</time>
      <a class="post-link" href="posts/${filename}">${tEsc}</a>
      <span class="post-tags">${tagsHTML}</span>
    `;
    postList.prepend(li);
  }
  function downloadFile(name, contents){
    const blob = new Blob([contents], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  let postsDirHandle = null;
  async function ensureDirHandle(){
    if (postsDirHandle) return postsDirHandle;
    postsDirHandle = await window.showDirectoryPicker({ id: 'journal-posts' });
    return postsDirHandle;
  }
  async function saveIntoPosts(name, contents){
    const dir = await ensureDirHandle();
    const fileHandle = await dir.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();
    return fileHandle;
  }

  document.getElementById('saveToPosts')?.addEventListener('click', async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert('Your browser does not support direct folder saving. Use “Download .html” instead.');
        return;
      }
      const post = buildPost();
      await saveIntoPosts(post.filename, post.html);
      appendToList(post);
      alert(`Saved ${post.filename} into your chosen /posts folder.`);
    } catch (err){
      console.error(err);
      alert('Could not save to folder. Try “Download .html” instead.');
    }
  });
  document.getElementById('downloadHtml')?.addEventListener('click', () => {
    const post = buildPost();
    downloadFile(post.filename, post.html);
    appendToList(post);
  });
})();