.PHONY: help install build build-rust build-dart clean test watch

help:
	@echo "Available commands:"
	@echo "  make install     - Install all dependencies"
	@echo "  make build       - Build the entire extension"
	@echo "  make build-rust  - Build only Rust/WASM module"
	@echo "  make build-dart  - Build only Dart to JavaScript"
	@echo "  make clean       - Clean all build artifacts"
	@echo "  make test        - Run tests"
	@echo "  make watch       - Watch for changes and rebuild"

install:
	@echo "Installing Rust dependencies..."
	cd rust && cargo fetch
	@echo "Installing Dart dependencies..."
	cd dart && dart pub get
	@echo "Checking for wasm-pack..."
	@which wasm-pack > /dev/null || (echo "wasm-pack not found. Install with: cargo install wasm-pack" && exit 1)
	@echo "All dependencies installed!"

build: build-rust build-dart
	@echo "Build complete! Extension is ready in ./extension/"

build-rust:
	@echo "Building Rust to WebAssembly..."
	cd rust && wasm-pack build --target web --out-dir ../extension/wasm --no-typescript
	@echo "Rust/WASM build complete!"

build-dart:
	@echo "Building Dart to JavaScript..."
	@echo "Note: Dart compilation to JS for web requires dart compile js"
	@echo "For now, using TypeScript alternative (see README)"
	@echo "Dart build would require: dart compile js -o extension/lib/popup.js dart/lib/popup/popup.dart"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf rust/target
	rm -rf rust/pkg
	rm -rf extension/wasm/*
	rm -rf extension/lib/*
	rm -rf dart/.dart_tool
	rm -rf dart/build
	@echo "Clean complete!"

test:
	@echo "Running Rust tests..."
	cd rust && cargo test
	@echo "Tests complete!"

watch:
	@echo "Watch mode not implemented yet"
	@echo "Use 'cargo watch' for Rust or implement file watching"
