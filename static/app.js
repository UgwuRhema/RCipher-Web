const tabEncrypt = document.getElementById("tab-encrypt");
const tabDecrypt = document.getElementById("tab-decrypt");
const encryptPanel = document.getElementById("encrypt-panel");
const decryptPanel = document.getElementById("decrypt-panel");

const plaintext = document.getElementById("plaintext");
const plainCount = document.getElementById("plain-count");
const encryptBtn = document.getElementById("encrypt-btn");
const cipherOutput = document.getElementById("cipher-output");
const copyCipher = document.getElementById("copy-cipher");
const useCipher = document.getElementById("use-cipher");

const cipherInput = document.getElementById("cipher-input");
const decryptBtn = document.getElementById("decrypt-btn");
const plainOutput = document.getElementById("plain-output");
const copyPlain = document.getElementById("copy-plain");

const status = document.getElementById("status");

function setStatus(message, kind) {
	status.textContent = message;
	status.className = "status" + (kind ? " " + kind : "");
}

function switchTab(which) {
	const encrypting = which === "encrypt";
	tabEncrypt.classList.toggle("active", encrypting);
	tabDecrypt.classList.toggle("active", !encrypting);
	tabEncrypt.setAttribute("aria-selected", String(encrypting));
	tabDecrypt.setAttribute("aria-selected", String(!encrypting));
	encryptPanel.classList.toggle("hidden", !encrypting);
	decryptPanel.classList.toggle("hidden", encrypting);
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encryptText(text) {
	const bytes = encoder.encode(text);
	return Array.from(bytes, (b) => (b - 2) & 0xff)
		.map((v) => v + ".")
		.join("");
}

function decryptText(cipher) {
	const tokens = cipher.split(/[.\s]+/).filter(Boolean);
	const bytes = tokens.map((tok) => {
		if (!/^\d+$/.test(tok)) {
			throw new Error(`Invalid cipher value "${tok}"`);
		}
		return (Number(tok) + 2) & 0xff;
	});
	return decoder.decode(new Uint8Array(bytes));
}

plaintext.addEventListener("input", () => {
	plainCount.textContent = `${plaintext.value.length} / 256`;
});

encryptBtn.addEventListener("click", () => {
	if (!plaintext.value) {
		setStatus("Enter some text to encrypt.", "error");
		return;
	}
	cipherOutput.value = encryptText(plaintext.value);
	setStatus("Encryption successful.", "success");
});

decryptBtn.addEventListener("click", () => {
	if (!cipherInput.value.trim()) {
		setStatus("Paste a cipher to decrypt.", "error");
		return;
	}
	try {
		plainOutput.value = decryptText(cipherInput.value);
		setStatus("Decryption successful.", "success");
	} catch (err) {
		setStatus(err.message, "error");
	}
});

async function copyText(text) {
	if (navigator.clipboard && window.isSecureContext) {
		await navigator.clipboard.writeText(text);
		return;
	}
	const helper = document.createElement("textarea");
	helper.value = text;
	document.body.appendChild(helper);
	helper.select();
	document.execCommand("copy");
	helper.remove();
}

copyCipher.addEventListener("click", async () => {
	if (!cipherOutput.value) {
		setStatus("Nothing to copy yet.", "error");
		return;
	}
	await copyText(cipherOutput.value);
	setStatus("Cipher copied to clipboard.", "success");
});

copyPlain.addEventListener("click", async () => {
	if (!plainOutput.value) {
		setStatus("Nothing to copy yet.", "error");
		return;
	}
	await copyText(plainOutput.value);
	setStatus("Plain text copied to clipboard.", "success");
});

useCipher.addEventListener("click", () => {
	if (!cipherOutput.value) {
		setStatus("Encrypt something first.", "error");
		return;
	}
	cipherInput.value = cipherOutput.value;
	plainOutput.value = "";
	switchTab("decrypt");
	setStatus("Cipher moved to the decrypt tab.", "success");
});

tabEncrypt.addEventListener("click", () => switchTab("encrypt"));
tabDecrypt.addEventListener("click", () => switchTab("decrypt"));
