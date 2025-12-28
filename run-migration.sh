#!/bin/bash
# Run this script if you have Supabase CLI installed
# Usage: ./run-migration.sh

if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "📝 Running migration..."
supabase db execute --file migration-execute.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

