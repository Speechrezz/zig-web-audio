package main

import (
	"log"
	"net/http"
)

const addr string = ":8080"

func main() {
	mux := http.NewServeMux()
	mux.Handle("/", http.HandlerFunc(homePage))
	mux.Handle("/src/", http.StripPrefix("/src/", http.FileServer(http.Dir("./src"))))

	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	log.Printf("Server running at http://localhost%s", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func homePage(w http.ResponseWriter, req *http.Request) {
	if req.URL.Path != "/" {
		http.NotFound(w, req)
		return
	}
	http.ServeFile(w, req, "index.html")
}
