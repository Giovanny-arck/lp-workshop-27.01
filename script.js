document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. CONFIGURAÇÃO DO LINK ÚNICO DE CHECKOUT ---
    // Coloque aqui o seu link de checkout geral da Hotmart
    const LINK_DO_CHECKOUT = 'https://pay.hotmart.com/S103728920U?checkoutMode=10'; 

    // --- 2. LÓGICA DE SCROLL (Mobile vs Desktop) ---
    const scrollButtons = document.querySelectorAll('.btn-scroll');
    const heroSection = document.querySelector('.hero-section');
    const formContainer = document.querySelector('.form-container');
    const nomeInput = document.querySelector('input[name="nome"]');

    scrollButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();

            // Lógica de Scroll
            if (window.innerWidth < 1002) {
                // Mobile: desce até o formulário
                formContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                // Desktop: sobe para o topo
                heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

            // Foca no campo de nome
            setTimeout(() => {
                if(nomeInput) nomeInput.focus();
            }, 800); 
        });
    });

    // --- 3. CONFIGURAÇÃO DO TELEFONE INTERNACIONAL ---
    const whatsappInput = document.querySelector("#whatsapp");
    const iti = window.intlTelInput(whatsappInput, {
      initialCountry: "auto",
      geoIpLookup: function(callback) {
        fetch("https://ipapi.co/json")
          .then(res => res.json())
          .then(data => callback(data.country_code))
          .catch(() => callback("us"));
      },
      utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
    });

    // --- 4. CAPTURA DE UTMs ---
    function getUtmParams() {
        const params = new URLSearchParams(window.location.search);
        const utm = {};
        for (const [key, value] of params.entries()) {
            if (key.startsWith('utm_')) {
                utm[key] = value;
            }
        }
        return utm;
    }

    const form = document.getElementById('register-form');
    const submitButton = document.getElementById('submit-button');
    
    // --- 5. ENVIO DO FORMULÁRIO ---
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      if (!iti.isValidNumber()) {
        alert('Por favor, insira um número de telefone válido.');
        return;
      }
      
      const urlParams = new URLSearchParams(window.location.search);

      const formData = {
        nome: form.nome.value,
        email: form.email.value,
        whatsapp: iti.getNumber(), 
        utm_placement: urlParams.get('utm_placement') || '',
        utm_id: urlParams.get('utm_id') || '',
        ...getUtmParams() 
      };
      
      if (!formData.nome || !formData.email || !formData.whatsapp) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
      }
      
      submitButton.disabled = true;
      submitButton.textContent = 'PROCESSANDO...';
      
      try {
        // Envio para webhook principal (Validação de duplicidade)
        const response1 = await fetch('https://n8nwebhook.arck1pro.shop/webhook/rd_crm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        // --- CORREÇÃO AQUI: Se já existe (409), só avisa e para. ---
        if (response1.status === 409) { 
          alert('Você já tem um cadastro conosco.');
          
          // Reabilita o botão para não parecer travado
          submitButton.disabled = false;
          submitButton.textContent = 'QUERO PARTICIPAR';
          
          return; // Para a execução AQUI. Não executa o redirecionamento abaixo.
        }
        
        if (!response1.ok) {
          throw new Error('Erro na primeira validação do formulário.');
        }

        // Envio para webhook secundário (RD Mkt)
        try {
            await fetch('https://n8nwebhook.arck1pro.shop/webhook/rd_mkt', { 
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });
        } catch (rdError) {
            console.warn('Erro RD Mkt', rdError);
        }
        
        // Pixel
        if (typeof fbq === 'function') {
          fbq('track', 'CompleteRegistration');
        }
        
        // --- REDIRECIONAMENTO (SÓ ACONTECE SE PASSAR PELAS VALIDAÇÕES ACIMA) ---
        window.location.href = LINK_DO_CHECKOUT;

      } catch (error) {
        alert('Ocorreu um erro ao processar sua inscrição. Tente novamente.');
        console.error(error);
        
        submitButton.disabled = false;
        submitButton.textContent = 'QUERO PARTICIPAR';
      }
    });
});
