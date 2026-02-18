import sys

filepath = r'd:\ADD(DevAlert)\frontend\src\pages\AdminPage.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The broken closing - find and replace the exact broken sequence
old = (
    "                                ))}\r\n"
    "                        </tbody>\r\n"
    "                     </table>\r\n"
    "                 </div>\r\n"
    "                 </div>\r\n"
    "     )\r\n"
    " }\r\n"
)

new = (
    "                                ))}\r\n"
    "                        </tbody>\r\n"
    "                        </table>\r\n"
    "                    </div>\r\n"
    "                    )}\r\n"
    "                </div>\r\n"
    "            )}\r\n"
)

if old in content:
    content = content.replace(old, new, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed successfully!")
else:
    # Try to find what's actually there
    idx = content.find("                                ))}")
    if idx >= 0:
        print("Found at index", idx)
        print(repr(content[idx:idx+300]))
    else:
        print("Pattern not found")
        # Show lines around 994
        lines = content.split('\n')
        for i, line in enumerate(lines[990:1005], start=991):
            print(f"{i}: {repr(line)}")
