package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strconv"
	"strings"
)

//go:embed static/*
var staticFiles embed.FS

type cipherRequest struct {
	Text   string `json:"text"`
	Cipher string `json:"cipher"`
}

type cipherResponse struct {
	Result string `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

// encrypt mirrors rcipher.c: (byte - 2) & 0xff, written as decimal followed by '.'.
func encrypt(text string) string {
	var b strings.Builder
	for i := 0; i < len(text); i++ {
		v := (text[i] - 2) & 0xff
		fmt.Fprintf(&b, "%d.", v)
	}
	b.WriteByte('\n')
	return b.String()
}

// decrypt mirrors rcipher.c: parse tokens split on '.'/newlines, then (value + 2) & 0xff.
func decrypt(cipher string) (string, error) {
	tokens := strings.FieldsFunc(cipher, func(r rune) bool {
		return r == '.' || r == '\n' || r == '\r' || r == ' ' || r == '\t'
	})
	var b strings.Builder
	for _, tok := range tokens {
		v, err := strconv.ParseUint(tok, 10, 32)
		if err != nil {
			return "", fmt.Errorf("invalid cipher value %q", tok)
		}
		b.WriteByte(byte((v + 2) & 0xff))
	}
	return b.String(), nil
}

func writeJSON(w http.ResponseWriter, status int, payload cipherResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func handleEncrypt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, cipherResponse{Error: "use POST"})
		return
	}
	var req cipherRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, cipherResponse{Error: "invalid request body"})
		return
	}
	writeJSON(w, http.StatusOK, cipherResponse{Result: encrypt(req.Text)})
}

func handleDecrypt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, cipherResponse{Error: "use POST"})
		return
	}
	var req cipherRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, cipherResponse{Error: "invalid request body"})
		return
	}
	result, err := decrypt(req.Cipher)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, cipherResponse{Error: err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, cipherResponse{Result: result})
}

func main() {
	sub, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.FS(sub)))
	mux.HandleFunc("/api/encrypt", handleEncrypt)
	mux.HandleFunc("/api/decrypt", handleDecrypt)

	addr := ":8080"
	log.Printf("RCipher WebApp running at http://localhost%s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
