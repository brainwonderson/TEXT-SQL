document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const toggleConfig = document.getElementById('toggle-config');
    const configCard = document.querySelector('.config-card');
    const configBody = document.getElementById('config-body');
    const btnConnect = document.getElementById('btn-connect');
    const connectionStatus = document.getElementById('connection-status');
    const btnRefreshSchema = document.getElementById('btn-refresh-schema');
    const schemaPlaceholder = document.getElementById('schema-placeholder');
    const schemaList = document.getElementById('schema-list');
    
    const dbHost = document.getElementById('db-host');
    const dbUser = document.getElementById('db-user');
    const dbPort = document.getElementById('db-port');
    const dbPassword = document.getElementById('db-password');
    const dbName = document.getElementById('db-name');
    const geminiKey = document.getElementById('gemini-key');
    
    const dbActiveIcon = document.getElementById('db-active-icon');
    const dbActiveName = document.getElementById('db-active-name');
    
    const queryInput = document.getElementById('query-input');
    const btnSubmitQuery = document.getElementById('btn-submit-query');
    const suggestionChips = document.getElementById('suggestion-chips');
    const chips = suggestionChips.querySelectorAll('.chip');
    
    const loadingState = document.getElementById('loading-state');
    const loadingText = document.getElementById('loading-text');
    const resultsDashboard = document.getElementById('results-dashboard');
    const sqlCode = document.getElementById('sql-code');
    const btnCopySql = document.getElementById('btn-copy-sql');
    const aiExplanation = document.getElementById('ai-explanation');
    const rowCount = document.getElementById('row-count');
    const dataTable = document.getElementById('data-table');
    
    const errorCard = document.getElementById('error-card');
    const errorMessage = document.getElementById('error-message');
    const errorSqlContainer = document.getElementById('error-sql-container');
    const errorSqlCode = document.getElementById('error-sql-code');

    let typingTimeout;

    // Load saved database configuration from localStorage (convenience for user)
    const loadSavedConfig = () => {
        const saved = localStorage.getItem('db_sql_config');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                dbHost.value = config.host || 'localhost';
                dbUser.value = config.user || 'root';
                dbPort.value = config.port || '3306';
                dbPassword.value = config.password || '';
                dbName.value = config.database || '';
                if (config.geminiKey) {
                    geminiKey.value = config.geminiKey;
                }
            } catch (e) {
                console.error("Gagal memuat konfigurasi lokal", e);
            }
        }
    };
    loadSavedConfig();

    // Save configuration helper
    const saveConfigToLocal = () => {
        const config = {
            host: dbHost.value,
            user: dbUser.value,
            port: dbPort.value,
            password: dbPassword.value,
            database: dbName.value,
            geminiKey: geminiKey.value
        };
        localStorage.setItem('db_sql_config', JSON.stringify(config));
    };

    // Toggle Sidebar Config Card
    toggleConfig.addEventListener('click', () => {
        configCard.classList.toggle('collapsed');
        configBody.classList.toggle('hidden');
    });

    // Connect to Database Action
    btnConnect.addEventListener('click', async () => {
        const database = dbName.value.trim();
        if (!database) {
            alert('Nama Database tidak boleh kosong.');
            return;
        }

        // Show loading state
        btnConnect.disabled = true;
        btnConnect.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menghubungkan...';
        
        connectionStatus.className = 'status-badge disconnected';
        connectionStatus.querySelector('.status-text').textContent = 'Sedang Menghubungkan...';

        try {
            const response = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host: dbHost.value,
                    port: dbPort.value,
                    user: dbUser.value,
                    password: dbPassword.value,
                    database: database
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                saveConfigToLocal();
                
                // Update UI state to connected
                connectionStatus.className = 'status-badge connected';
                connectionStatus.querySelector('.status-text').textContent = 'Terhubung';
                
                dbActiveIcon.classList.remove('hidden');
                dbActiveName.textContent = `Database Aktif: ${database}`;
                
                // Enable controls
                queryInput.disabled = false;
                btnSubmitQuery.disabled = false;
                btnRefreshSchema.disabled = false;
                chips.forEach(chip => chip.disabled = false);
                
                // Collapse configuration card to save space
                configCard.classList.add('collapsed');
                configBody.classList.add('hidden');
                
                // Render schema
                renderSchema(result.schema);
            } else {
                throw new Error(result.message || 'Gagal terhubung ke database.');
            }
        } catch (error) {
            console.error(error);
            connectionStatus.className = 'status-badge disconnected';
            connectionStatus.querySelector('.status-text').textContent = 'Koneksi Gagal';
            dbActiveIcon.classList.add('hidden');
            dbActiveName.textContent = 'Gagal terhubung database';
            
            // Disable controls
            queryInput.disabled = true;
            btnSubmitQuery.disabled = true;
            btnRefreshSchema.disabled = true;
            chips.forEach(chip => chip.disabled = true);
            
            alert(error.message);
        } finally {
            btnConnect.disabled = false;
            btnConnect.innerHTML = '<i class="fa-solid fa-plug"></i> Hubungkan';
        }
    });

    // Refresh Schema Action
    btnRefreshSchema.addEventListener('click', async () => {
        btnRefreshSchema.disabled = true;
        btnRefreshSchema.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i>';
        try {
            const response = await fetch('/api/schema');
            const result = await response.json();
            if (result.success) {
                renderSchema(result.schema);
            } else {
                alert('Gagal me-refresh skema: ' + result.message);
            }
        } catch (err) {
            alert('Error me-refresh skema: ' + err.message);
        } finally {
            btnRefreshSchema.disabled = false;
            btnRefreshSchema.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
        }
    });

    // Parse text-based schema into structured array
    const parseSchema = (schemaText) => {
        if (!schemaText) return [];
        const tables = [];
        // Split by "Table: " but keep the match
        const parts = schemaText.split(/(?=Table: )/);
        
        for (const part of parts) {
            const lines = part.trim().split('\n');
            if (lines.length === 0 || !lines[0].startsWith('Table:')) continue;
            
            const tableName = lines[0].replace('Table:', '').trim();
            const columns = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('-')) {
                    const isPri = line.includes('(Primary Key)');
                    let colText = line.replace('-', '').trim();
                    colText = colText.replace('(Primary Key)', '').trim();
                    
                    // Match "column_name (data_type)"
                    const match = colText.match(/^(.+?)\s*\((.+?)\)$/);
                    if (match) {
                        columns.push({
                            name: match[1].trim(),
                            type: match[2].trim(),
                            isPrimary: isPri
                        });
                    } else {
                        columns.push({
                            name: colText,
                            type: 'unknown',
                            isPrimary: isPri
                        });
                    }
                }
            }
            tables.push({ name: tableName, columns });
        }
        return tables;
    };

    // Render Database Schema Tree UI
    const renderSchema = (schemaText) => {
        const tables = parseSchema(schemaText);
        
        if (tables.length === 0) {
            schemaPlaceholder.classList.remove('hidden');
            schemaList.classList.add('hidden');
            return;
        }
        
        schemaPlaceholder.classList.add('hidden');
        schemaList.innerHTML = '';
        schemaList.classList.remove('hidden');
        
        tables.forEach(table => {
            const tableItem = document.createElement('div');
            tableItem.className = 'schema-table-item';
            
            const header = document.createElement('div');
            header.className = 'schema-table-header';
            header.innerHTML = `
                <div class="schema-table-name">
                    <i class="fa-solid fa-table"></i>
                    <span>${table.name}</span>
                </div>
                <i class="fa-solid fa-chevron-down toggle-columns-icon"></i>
            `;
            
            const colsList = document.createElement('div');
            colsList.className = 'schema-columns-list hidden';
            
            table.columns.forEach(col => {
                const colItem = document.createElement('div');
                colItem.className = 'schema-col-item';
                colItem.innerHTML = `
                    <div class="col-name ${col.isPrimary ? 'primary-key' : ''}">
                        ${col.isPrimary ? '<i class="fa-solid fa-key" style="font-size:0.65rem;"></i>' : ''}
                        <span>${col.name}</span>
                    </div>
                    <div class="col-type">${col.type}</div>
                `;
                colsList.appendChild(colItem);
            });
            
            tableItem.appendChild(header);
            tableItem.appendChild(colsList);
            
            // Expand/Collapse columns event
            header.addEventListener('click', () => {
                colsList.classList.toggle('hidden');
                header.querySelector('.toggle-columns-icon').classList.toggle('fa-chevron-down');
                header.querySelector('.toggle-columns-icon').classList.toggle('fa-chevron-up');
            });
            
            schemaList.appendChild(tableItem);
        });
    };

    // Copy SQL Query text to clipboard
    btnCopySql.addEventListener('click', () => {
        const sqlText = sqlCode.textContent;
        navigator.clipboard.writeText(sqlText).then(() => {
            const originalIcon = btnCopySql.innerHTML;
            btnCopySql.innerHTML = '<i class="fa-solid fa-check text-success"></i>';
            setTimeout(() => {
                btnCopySql.innerHTML = originalIcon;
            }, 2000);
        }).catch(err => {
            alert('Gagal menyalin teks: ' + err);
        });
    });

    // Typewriter Typing Animation for AI response
    const typeWriterEffect = (element, text, speed = 8) => {
        clearTimeout(typingTimeout);
        element.innerHTML = '';
        let i = 0;
        
        // Remove markdown formatting wrappers like bold or italic for simple rendering, or support basic markdown
        // For basic HTML rendering, convert markdown bullets/stars to list items
        let formattedText = text
            .replace(/\n\s*\*\s*(.+)/g, '\n<li>$1</li>') // convert bullets
            .replace(/\n\s*-\s*(.+)/g, '\n<li>$1</li>'); // convert dashes
        
        // Wrap lists in ul
        if (formattedText.includes('<li>')) {
            // Very basic replacement
            formattedText = formattedText.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        }
        
        // Convert double newlines to paragraph breaks
        formattedText = formattedText.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
        
        // Let's do a typing effect using characters but inject as HTML incrementally
        // To do typing with HTML safely, we can create a temporary div and type by word or char
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formattedText;
        
        // Simple HTML-safe typing effect:
        // We will display blocks of text gradually
        const nodes = Array.from(tempDiv.childNodes);
        element.innerHTML = '';
        
        let nodeIndex = 0;
        
        const typeNextNode = () => {
            if (nodeIndex < nodes.length) {
                const node = nodes[nodeIndex];
                if (node.nodeType === Node.TEXT_NODE) {
                    // Type text node character by character
                    const textContent = node.textContent;
                    let charIndex = 0;
                    const textSpan = document.createElement('span');
                    element.appendChild(textSpan);
                    
                    const typeChar = () => {
                        if (charIndex < textContent.length) {
                            textSpan.textContent += textContent.charAt(charIndex);
                            charIndex++;
                            typingTimeout = setTimeout(typeChar, speed);
                        } else {
                            nodeIndex++;
                            typeNextNode();
                        }
                    };
                    typeChar();
                } else {
                    // Elements (like <li>, <ul>, <br>) are appended immediately
                    element.appendChild(node.cloneNode(true));
                    nodeIndex++;
                    typingTimeout = setTimeout(typeNextNode, speed * 5);
                }
            }
        };
        
        typeNextNode();
    };

    // Render query data results to HTML Table
    const renderTable = (columns, rows) => {
        const thead = dataTable.querySelector('thead');
        const tbody = dataTable.querySelector('tbody');
        
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        if (columns.length === 0) {
            thead.innerHTML = '<tr><th>Hasil</th></tr>';
            tbody.innerHTML = '<tr><td style="text-align:center;color:var(--text-muted);">Query berhasil dijalankan tetapi tidak mengembalikan kolom data.</td></tr>';
            rowCount.textContent = '0 Kolom';
            return;
        }

        // Add headers
        const headerRow = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        
        // Add rows
        if (rows.length === 0) {
            const emptyRow = document.createElement('tr');
            const emptyCell = document.createElement('td');
            emptyCell.colSpan = columns.length;
            emptyCell.style.textAlign = 'center';
            emptyCell.style.color = 'var(--text-muted)';
            emptyCell.textContent = 'Tidak ada baris data yang ditemukan.';
            emptyRow.appendChild(emptyCell);
            tbody.appendChild(emptyRow);
            rowCount.textContent = '0 Baris';
            return;
        }
        
        rows.forEach(row => {
            const tr = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                const val = row[col];
                td.textContent = val === null ? 'NULL' : val;
                if (val === null) {
                    td.style.fontStyle = 'italic';
                    td.style.opacity = '0.5';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        
        rowCount.textContent = `${rows.length} Baris`;
    };

    // Execute Natural Language Query
    const executeUserQuery = async (question) => {
        if (!question.trim()) return;
        
        // Clear UI states
        resultsDashboard.classList.add('hidden');
        errorCard.classList.add('hidden');
        errorSqlContainer.classList.add('hidden');
        
        // Disable UI
        queryInput.disabled = true;
        btnSubmitQuery.disabled = true;
        chips.forEach(chip => chip.disabled = true);
        
        // Show Loading State
        loadingState.classList.remove('hidden');
        loadingText.textContent = 'AI sedang memformulasikan SQL Query...';
        
        const key = geminiKey.value.trim();
        
        try {
            // Step 1 & 2: Translate question to SQL (API call does this and executes in one go)
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question,
                    api_key: key
                })
            });
            
            // Adjust loading text dynamically to feel responsive
            loadingText.textContent = 'Mengeksekusi SQL di database lokal...';
            
            const result = await response.json();
            
            loadingState.classList.add('hidden');
            
            if (result.success) {
                // Render SQL
                sqlCode.textContent = result.sql;
                
                // Render Table Results
                renderTable(result.columns, result.rows);
                
                // Show dashboard
                resultsDashboard.classList.remove('hidden');
                
                // Show explanation with typewriter animation
                aiExplanation.innerHTML = '';
                typeWriterEffect(aiExplanation, result.explanation);
                
            } else {
                // Check if SQL error
                if (result.error_type === 'database') {
                    showError(result.message, result.sql);
                } else {
                    showError(result.message);
                }
            }
        } catch (error) {
            loadingState.classList.add('hidden');
            showError('Terjadi kegagalan koneksi ke API Server local: ' + error.message);
        } finally {
            // Enable UI
            queryInput.disabled = false;
            btnSubmitQuery.disabled = false;
            chips.forEach(chip => chip.disabled = false);
        }
    };

    const showError = (message, sql = null) => {
        errorMessage.textContent = message;
        if (sql) {
            errorSqlCode.textContent = sql;
            errorSqlContainer.classList.remove('hidden');
        } else {
            errorSqlContainer.classList.add('hidden');
        }
        errorCard.classList.remove('hidden');
    };

    // Submit events
    btnSubmitQuery.addEventListener('click', () => {
        executeUserQuery(queryInput.value);
    });

    queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            executeUserQuery(queryInput.value);
        }
    });

    // Chips clicks
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            queryInput.value = chip.textContent;
            executeUserQuery(chip.textContent);
        });
    });
});
