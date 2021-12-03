# nestJS async transform test

This is a nestJS project to test integration of custom async class transform, found [here](https://gist.github.com/flisboac/6af02b5254088558362757593dc54f9c).   
Many thanks to @flisboac for his work and help!

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn start

# watch mode
$ yarn start:dev
```

## Use test endpoint
```bash
$ curl -X POST http://localhost:3000/ -d '{"name": "Some name", "age": 3, "size": 10}' -H "Content-Type: application/json"
```
