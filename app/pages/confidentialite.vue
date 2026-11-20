<template>
  <v-card class="kairos-auth__card privacy-policy">
    <h1 class="kairos-panel__title">
      Politique de confidentialité
    </h1>
    <p class="privacy-policy__paragraph">
      Kairos est une application privée de gestion de stock pour l’achat-revente, utilisée par son propriétaire et les personnes qu’il invite. Elle n’affiche aucune publicité et ne vend aucune donnée.
    </p>

    <h2 class="privacy-policy__heading">
      Données enregistrées
    </h2>
    <p class="privacy-policy__paragraph">
      Votre compte : adresse e-mail, nom affiché et mot de passe, conservé sous forme d’empreinte et jamais en clair. Ce que vous saisissez : produits, codes-barres, achats, stock, ventes, dettes, lieux et personnes.
    </p>
    <p class="privacy-policy__paragraph">
      Les photos prises pour reconnaître un produit sont analysées sur le serveur de Kairos et ne sont pas conservées ; seule une empreinte numérique de l’image peut être gardée pour reconnaître ce produit plus vite la fois suivante.
    </p>
    <p class="privacy-policy__paragraph">
      Kairos n’utilise qu’un cookie, pour garder votre session ouverte, et aucun outil de mesure d’audience.
    </p>

    <h2 class="privacy-policy__heading">
      Hébergement et sauvegardes
    </h2>
    <p class="privacy-policy__paragraph">
      Les données sont stockées sur un serveur loué par le propriétaire de Kairos chez OVHcloud. Elles sont sauvegardées chaque jour sur ce serveur et, si la copie est activée, dans le Google Drive du propriétaire. Chaque sauvegarde est effacée au bout de 14 jours environ.
    </p>

    <h2 class="privacy-policy__heading">
      Google Drive
    </h2>
    <p class="privacy-policy__paragraph">
      Kairos demande seulement l’accès aux fichiers qu’il crée lui-même dans le Google Drive de son propriétaire. Il s’en sert uniquement pour y déposer les sauvegardes de sa base de données et supprimer les plus anciennes ; il ne lit, ne modifie ni ne partage aucun autre fichier.
    </p>
    <p class="privacy-policy__paragraph">
      L’utilisation par Kairos des informations reçues des API Google respecte le Règlement sur les données utilisateur des services d’API Google, y compris les exigences d’utilisation limitée. L’accès peut être retiré à tout moment depuis
      <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>.
    </p>

    <h2 class="privacy-policy__heading">
      Services consultés
    </h2>
    <p class="privacy-policy__paragraph">
      Pour identifier un produit et estimer son prix, Kairos interroge eBay, Cardmarket, TCGdex, PSA, Open Beauty Facts et UPCitemdb avec le code-barres, le numéro de certificat ou le nom du produit, jamais avec vos données personnelles.
    </p>

    <h2 class="privacy-policy__heading">
      Vos droits
    </h2>
    <p class="privacy-policy__paragraph">
      Vos données restent tant que votre compte existe. Pour les consulter, les corriger ou les supprimer, adressez-vous au propriétaire de Kairos, la personne qui vous a invité.
    </p>

    <p class="privacy-policy__updated">
      Mise à jour le 20 novembre 2026.
    </p>
    <NuxtLink
      to="/connexion"
      class="kairos-auth__secondary-link"
    >
      Retour à Kairos
    </NuxtLink>
  </v-card>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'centered' })

useHead({ title: 'Politique de confidentialité · Kairos' })
</script>

<style scoped>
.privacy-policy__heading {
  margin: 18px 0 6px;
  font-family: var(--kairos-display-font);
  font-size: 14px;
  font-weight: 600;
}

.privacy-policy__paragraph {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.5;
}

.privacy-policy__updated {
  margin: 18px 0 0;
  color: var(--kairos-text-secondary);
  font-size: 13px;
}
</style>
