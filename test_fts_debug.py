import sqlite3

conn = sqlite3.connect('sparksage.db')
c = conn.cursor()

# Check FTS data
print('=== FTS Table Data ===')
c.execute('SELECT COUNT(*) FROM conversations_fts')
print("Total FTS rows:", c.fetchone()[0])

# Check first row
c.execute('SELECT rowid, content FROM conversations_fts LIMIT 1')
row = c.fetchone()
if row:
    print(f"First row: rowid={row[0]}, content={row[1][:80]}")

# Test exact search query used by the code
print('\n=== Test MATCH query ===')
c.execute('SELECT COUNT(*) FROM conversations_fts WHERE conversations_fts MATCH ?', ('you',))
count = c.fetchone()[0]
print("MATCH 'you' results:", count)

# Try simpler match
c.execute('SELECT COUNT(*) FROM conversations_fts WHERE conversations_fts MATCH ?', ('are',))
print("MATCH 'are' results:", c.fetchone()[0])

# Check what's actually being queried in the conversations table
print('\n=== Conversations table sample ===')
c.execute('SELECT id, content FROM conversations LIMIT 1')
row = c.fetchone()
if row:
    print(f"ID={row[0]}, content={row[1][:80]}")

conn.close()
