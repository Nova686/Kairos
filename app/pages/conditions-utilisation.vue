<template>
  <v-card class="kairos-auth__card terms-of-use">
    <h1 class="kairos-panel__title">
      Conditions d’utilisation
    </h1>
    <p class="terms-of-use__paragraph">
      Kairos est une application privée de gestion de stock pour l’achat-revente. Son propriétaire la met gratuitement à la disposition des personnes qu’il invite. En utilisant Kairos, vous acceptez les conditions ci-dessous.
    </p>

    <h2 class="terms-of-use__heading">
      Accès
    </h2>
    <p class="terms-of-use__paragraph">
      Un compte se crée uniquement sur invitation. Il est personnel : gardez votre mot de passe secret et ne le partagez pas. Le propriétaire de Kairos peut suspendre ou supprimer un compte à tout moment.
    </p>

    <h2 class="terms-of-use__heading">
      Utilisation
    </h2>
    <p class="terms-of-use__paragraph">
      Kairos sert à suivre vos achats, votre stock et vos ventes. Ne saisissez que des informations que vous avez le droit d’enregistrer, n’essayez pas d’accéder aux données des autres comptes et ne perturbez pas le service.
    </p>

    <h2 class="terms-of-use__heading">
      Prix affichés
    </h2>
    <p class="terms-of-use__paragraph">
      Les prix proviennent de sources publiques comme eBay, Cardmarket ou TCGdex. Ce sont des estimations, données à titre indicatif et sans garantie : vos décisions d’achat et de vente restent les vôtres.
    </p>

    <h2 class="terms-of-use__heading">
      Disponibilité
    </h2>
    <p class="terms-of-use__paragraph">
      Kairos est fourni gratuitement et en l’état, sans garantie de disponibilité ni d’absence d’erreur. Les données sont sauvegardées chaque jour, mais le propriétaire ne peut garantir qu’aucune donnée ne sera jamais perdue.
    </p>

    <h2 class="terms-of-use__heading">
      Données personnelles
    </h2>
    <p class="terms-of-use__paragraph">
      Ce que Kairos enregistre et comment il s’en sert est décrit dans la
      <NuxtLink to="/confidentialite">politique de confidentialité</NuxtLink>.
    </p>

    <h2 class="terms-of-use__heading">
      Évolution et contact
    </h2>
    <p class="terms-of-use__paragraph">
      Ces conditions peuvent évoluer ; la date ci-dessous indique leur dernière mise à jour. Pour toute question, adressez-vous au propriétaire de Kairos, la personne qui vous a invité.
    </p>

    <p class="terms-of-use__updated">
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

useHead({ title: 'Conditions d’utilisation · Kairos' })
</script>

<style scoped>
.terms-of-use__heading {
  margin: 18px 0 6px;
  font-family: var(--kairos-display-font);
  font-size: 14px;
  font-weight: 600;
}

.terms-of-use__paragraph {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.5;
}

.terms-of-use__updated {
  margin: 18px 0 0;
  color: var(--kairos-text-secondary);
  font-size: 13px;
}
</style>
