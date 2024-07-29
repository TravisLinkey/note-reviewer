#!/bin/bash

PLUGIN_NAME="note-reviewer"
RELEASE_DIR="release"

DIST_DIR="dist"
TEMP_DIR="temp"

tsc

# Create a temp directory
mkdir -p $TEMP_DIR


# Copy files to temp release directory
cp -r $DIST_DIR/* $TEMP_DIR/
cp manifest.json styles.css README.md $TEMP_DIR/

cd $TEMP_DIR

# Create the zip archive 
zip -r ../$PLUGIN_NAME.zip ./*

cd ..


# Move the zip archive to the release directory
mkdir -p $RELEASE_DIR
mv $PLUGIN_NAME.zip $RELEASE_DIR/


# Clean up the temporary release directory
rm -rf $TEMP_DIR

echo "Zip archive created: $RELEASE_DIR/$PLUGIN_DIR.zip"
