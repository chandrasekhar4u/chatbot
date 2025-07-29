document.getElementById('minimizeBtn').onclick = () => {
    const widget = document.getElementById('chatWidget');
    widget.classList.toggle('minimized');
};

document.getElementById('settingsBtn').onclick = () => {
    document.getElementById('settingsModal').style.display = 'flex';
};
document.getElementById('closeSettings').onclick = () => {
    document.getElementById('settingsModal').style.display = 'none';
};
document.getElementById('applySettings').onclick = () => {
    const width = document.getElementById('chatWidth').value;
    const height = document.getElementById('chatHeight').value;
    const widget = document.getElementById('chatWidget');
    widget.style.width = `${width}%`;
    widget.style.height = `${height}%`;
    document.getElementById('settingsModal').style.display = 'none';
};

function renderQuickReplies(prompts) {
    const qrDiv = document.getElementById('quickReplies');
    qrDiv.innerHTML = '';
    prompts.forEach((prompt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quick-reply-btn';
        btn.textContent = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;
        btn.title = prompt;
        btn.onclick = () => {
            document.getElementById('messageInput').value = prompt;
            document.getElementById('messageInput').focus();
            btn.classList.add('selected');
            Array.from(qrDiv.children).forEach(b => {
                if (b !== btn) b.classList.remove('selected');
            });
        };
        qrDiv.appendChild(btn);
    });
}

function appendMessage(text, isUser = false) {
    const messages = document.getElementById('messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message' + (isUser ? ' user' : ' bot');
    const label = document.createElement('span');
    label.className = 'sender-label';
    label.textContent = isUser ? 'user:' : 'bot:';
    msgDiv.appendChild(label);
    msgDiv.appendChild(document.createTextNode(' ' + text));
    messages.appendChild(msgDiv);
    messages.scrollTop = messages.scrollHeight;
}

function getConversationHistory() {
    const messages = document.querySelectorAll('#messages .message');
    let history = '';
    messages.forEach(msg => {
        history += msg.textContent + '\n';
    });
    return history.trim();
}

async function fetchPrompts() {
    const conversation = getConversationHistory();
    const res = await fetch('/suggest-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'conversation=' + encodeURIComponent(conversation)
    });
    return await res.json();
}

async function sendMessage(message) {
    const res = await fetch('/send', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: 'message=' + encodeURIComponent(message),
    });
    return await res.text();
}

document.getElementById('chatForm').onsubmit = async (e) => {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (!message) return;
    appendMessage(message, true);
    input.value = '';

    // Show "tool replying..." placeholder
    const messages = document.getElementById('messages');
    const pendingDiv = document.createElement('div');
    pendingDiv.className = 'message bot pending-reply';
    const label = document.createElement('span');
    label.className = 'sender-label';
    label.textContent = 'bot:';
    pendingDiv.appendChild(label);
    pendingDiv.appendChild(document.createTextNode(' tool replying...'));
    messages.appendChild(pendingDiv);
    messages.scrollTop = messages.scrollHeight;

    // Fetch actual reply
    const reply = await sendMessage(message);

    // Replace the placeholder with the real reply
    pendingDiv.textContent = '';
    pendingDiv.appendChild(label);
    pendingDiv.appendChild(document.createTextNode(' ' + reply));
    pendingDiv.classList.remove('pending-reply'); // Remove the pending style

    const prompts = await fetchPrompts();
    renderQuickReplies(prompts);
};

window.onload = async () => {
    const prompts = await fetchPrompts();
    renderQuickReplies(prompts);
    appendMessage(
        "Hi there! Nice to see you 😊 We have a 10% promo code for new customers! Would you like to get one now? 🎁"
    );
};

document.getElementById('clearChatBtn').addEventListener('click', function() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
});