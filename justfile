setup mode="eager":
  #!/usr/bin/env sh
  if [ "{{mode}}" == "eager" ] || [ ! -d "./node_modules" ]; then
    echo "running npm install"
    npm install
  fi

build: setup
  npm run build

format: setup
  npm run format

lint: setup
  npm run lint

test: setup
  npm run test
