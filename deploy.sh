#!/bin/bash

npm run build
git add .
git commit -m 'Adding support for Delta images'
git push origin radiatus
