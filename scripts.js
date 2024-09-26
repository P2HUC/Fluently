const editor = document.getElementById('text-editor');
        const correctionList = document.getElementById('correction-list');
        const errorCounter = document.getElementById('error-counter');
        const copyBtn = document.getElementById('copy-btn');
        const deleteBtn = document.getElementById('delete-btn');
        const homeBtn = document.getElementById('home-btn');
        const correctAllBtn = document.getElementById('correct-all-btn');

        let typingTimer;
        let errors = [];
        let lastText = '';

        async function checkGrammar(text) {
            try {
                const response = await fetch('https://api.languagetool.org/v2/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        'text': text,
                        'language': 'en-US'
                    })
                });

                const data = await response.json();
                errors = data.matches;
                highlightErrors(errors);
                updateCorrectionsPanel(errors);

            } catch (error) {
                console.error('Error checking grammar:', error);
            }
        }

        function getCaretPosition() {
            let sel = window.getSelection();
            if (sel.rangeCount) {
                let range = sel.getRangeAt(0);
                let preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(editor);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                return preCaretRange.toString().length;
            }
            return 0;
        }

        function setCaretPosition(offset) {
            let sel = window.getSelection();
            let range = document.createRange();
            let node = editor;

            let stack = [node];
            let charCount = 0;
            let found = false;

            while (stack.length > 0) {
                let currentNode = stack.pop();
                if (currentNode.nodeType === Node.TEXT_NODE) {
                    let textLength = currentNode.length;
                    if (charCount + textLength >= offset) {
                        range.setStart(currentNode, offset - charCount);
                        found = true;
                        break;
                    }
                    charCount += textLength;
                } else {
                    let children = currentNode.childNodes;
                    for (let i = children.length - 1; i >= 0; i--) {
                        stack.push(children[i]);
                    }
                }
            }

            if (!found) {
                range.setStart(node, node.childNodes.length);
            }

            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }

        function highlightErrors(matches) {
            const content = editor.innerText;
            let updatedContent = content;
            let offset = 0;

            let caretPosition = getCaretPosition();

            matches.forEach(match => {
                const incorrectText = updatedContent.substring(match.offset + offset, match.offset + offset + match.length);
                let className = '';

                if (match.rule.issueType === 'misspelling') {
                    className = 'highlight-red';
                } else if (match.rule.issueType === 'grammar') {
                    className = 'highlight-yellow';
                } else {
                    className = 'highlight-blue';
                }

                const span = `<span class="${className}" data-error="${match.message}" data-suggestions="${match.replacements.map(r => r.value).join(',')}">${incorrectText}</span>`;
                updatedContent = updatedContent.substring(0, match.offset + offset) + span + updatedContent.substring(match.offset + offset + match.length);
                offset += span.length - match.length;
            });

            editor.innerHTML = updatedContent;

            setCaretPosition(caretPosition);
        }

        function updateCorrectionsPanel(matches) {
            correctionList.innerHTML = '';
            matches.forEach((match, index) => {
                const listItem = document.createElement('div');
                listItem.classList.add('correction-item');
                listItem.id = `correction-${index}`;
                listItem.innerHTML = `
                    <span>${match.rule.issueType} - ${match.message}</span>
                    <div class="suggestion" onclick="replaceText('${match.replacements[0]?.value}', ${match.offset}, ${match.length}, ${index})">
                        ${match.replacements[0]?.value}
                    </div>
                `;
                correctionList.appendChild(listItem);
            });

            errorCounter.textContent = matches.length;
        }

        function replaceText(suggestion, offset, length, correctionIndex) {
            const content = editor.innerText;

            const updatedText = content.substring(0, offset) + suggestion + content.substring(offset + length);
            editor.innerText = updatedText;

            setTimeout(() => checkGrammar(updatedText), 100);

            const correctionItem = document.getElementById(`correction-${correctionIndex}`);
            if (correctionItem) {
                correctionItem.remove();
            }

            const currentErrors = correctionList.querySelectorAll('.correction-item').length;
            errorCounter.textContent = currentErrors;
        }

        function replaceTextAdjusted(suggestion, offset, length) {
            const content = editor.innerText;
            const updatedText = content.substring(0, offset) + suggestion + content.substring(offset + length);
            editor.innerText = updatedText;
            
            return updatedText;
        }

        correctAllBtn.addEventListener('click', () => {
            let content = editor.innerText;
            let totalOffsetChange = 0;

            errors.forEach((error) => {
                if (error.replacements && error.replacements[0]) {
                    const suggestion = error.replacements[0].value;
                    const offset = error.offset + totalOffsetChange;
                    const length = error.length;

                    const updatedText = replaceTextAdjusted(suggestion, offset, length);
                    totalOffsetChange += suggestion.length - length;
                    content = updatedText;
                }
            });

            checkGrammar(content);
        });

        // Detect typing in the editor
        editor.addEventListener('input', () => {
            clearTimeout(typingTimer);
            const text = editor.innerText;
            if (text !== lastText) {
                lastText = text;
                typingTimer = setTimeout(() => checkGrammar(text), 1000); // 1 second delay before calling grammar check
            }
        });

        copyBtn.addEventListener('click', () => {
            const text = editor.innerText;
            navigator.clipboard.writeText(text).then(() => {
                alert('Text copied to clipboard!');
            });
        });

        deleteBtn.addEventListener('click', () => {
            editor.innerHTML = '';
            correctionList.innerHTML = '';
            errorCounter.textContent = '0';
        });

        homeBtn.addEventListener('click', () => {
            window.location.href = 'index.html'; // Example for navigation to home
        });
        