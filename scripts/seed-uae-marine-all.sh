#!/bin/bash

echo "Running UAE Marine seed scripts..."

echo "Part 1..."
npx tsx prisma/seed-uae-marine.ts
if [ $? -ne 0 ]; then
    echo "Part 1 failed!"
    exit 1
fi

echo "Part 2..."
npx tsx prisma/seed-uae-marine-part2.ts
if [ $? -ne 0 ]; then
    echo "Part 2 failed!"
    exit 1
fi

echo "Part 3..."
npx tsx prisma/seed-uae-marine-part3.ts
if [ $? -ne 0 ]; then
    echo "Part 3 failed!"
    exit 1
fi

echo "Part 4..."
npx tsx prisma/seed-uae-marine-part4.ts
if [ $? -ne 0 ]; then
    echo "Part 4 failed!"
    exit 1
fi

echo "All seed scripts completed successfully!"