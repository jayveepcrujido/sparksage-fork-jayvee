import sqlite3
conn = sqlite3.connect('sparksage.db')
c = conn.cursor()

# Rebuild FTS5 index
print('Rebuilding FTS index...')
c.execute('INSERT INTO conversations_fts(conversations_fts) VALUES("rebuild")')
conn.commit()
print('FTS index rebuilt')

# Test again
c.execute('SELECT COUNT(*) FROM conversations_fts WHERE conversations_fts MATCH ?', ('you',))
print('After rebuild - MATCH you:', c.fetchone()[0])

c.execute('SELECT COUNT(*) FROM conversations_fts WHERE conversations_fts MATCH ?', ('are',))
print('After rebuild - MATCH are:', c.fetchone()[0])

# Try a simple word search
c.execute('SELECT COUNT(*)  FROM conversations_fts WHERE conversations_fts MATCH ?', ('conservative',))
print('After rebuild - MATCH conservative:', c.fetchone()[0])

conn.close()
