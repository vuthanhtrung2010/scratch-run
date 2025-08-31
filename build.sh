#!/bin/bash

PROJECT_DIR=$(pwd)
NODE_VERSION='18'
VERSION=$(node -p "import { readFileSync } from 'fs'; JSON.parse(readFileSync('$PROJECT_DIR/package.json', 'utf-8')).version")
BUILD_CMD="bunx pkg $PROJECT_DIR/dist/index.js"

rm -rf bin dist
bunx webpack

mkdir -p bin
cd bin

# Helper for packaging
do_package() {
  local target=$1
  local out_path=$2
  local exe_name=$3
  local zip_name=$4

  $BUILD_CMD -t "$target" --out-path "$out_path"
  cd "$out_path"
  if [[ $exe_name == *.exe ]]; then
    mv index.exe "$exe_name"
  else
    mv index "$exe_name"
  fi
  zip "../$zip_name" "$exe_name"
  cd ..
}

# Linux amd64
do_package "node${NODE_VERSION}-linux-x64" "linux-amd64" "scratch-run" "scratch-run_${VERSION}_linux_amd64.zip"

# Linux arm64
do_package "node${NODE_VERSION}-linux-arm64" "linux-arm64" "scratch-run" "scratch-run_${VERSION}_linux_arm64.zip"

# macOS amd64
do_package "node${NODE_VERSION}-macos-x64" "macos-amd64" "scratch-run" "scratch-run_${VERSION}_macos_amd64.zip"

# macOS arm64
do_package "node${NODE_VERSION}-macos-arm64" "macos-arm64" "scratch-run" "scratch-run_${VERSION}_macos_arm64.zip"

# Windows amd64
do_package "node${NODE_VERSION}-win-x64" "win-amd64" "scratch-run.exe" "scratch-run_${VERSION}_win_amd64.zip"

# Windows arm64
do_package "node${NODE_VERSION}-win-arm64" "win-arm64" "scratch-run.exe" "scratch-run_${VERSION}_win_arm64.zip"
