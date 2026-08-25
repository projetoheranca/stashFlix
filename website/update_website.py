import os
import glob
import re

website_dir = r"d:\bkp\STASHLYFLIX\website"
html_files = glob.glob(os.path.join(website_dir, "*.html"))

new_footer_html = """
    <footer>
      <div class="footer-links">
        <a href="/privacy.html">Política de Privacidade</a>
        <a href="/terms.html">Termos de Uso</a>
        <a href="/support.html">Suporte e Contato</a>
      </div>
      <div style="margin-top: 15px; font-size: 0.85rem; color: #888;">
        <strong>LEGATUM DESENVOLVIMENTO DE TECNOLOGIAS LTDA</strong><br>
        CNPJ 51.144.507/0001-50<br>
        <a href="mailto:help@stashflix.app" style="color: #888;">help@stashflix.app</a>
      </div>
      <p style="margin-top: 15px;">&copy; <span id="year"></span> StashFlix App. Todos os direitos reservados.</p>
    </footer>
"""

for file_path in html_files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Substituir footer
    content = re.sub(
        r"<footer>.*?</footer>",
        new_footer_html.strip(),
        content,
        flags=re.DOTALL
    )
    
    # Substituir email na página de suporte
    content = content.replace("suporte@stashflix.app", "help@stashflix.app")
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Website atualizado com sucesso!")
