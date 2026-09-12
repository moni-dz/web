<script lang="ts">
    let { panel, n, desktop, mobile }: {
        panel: string;
        n: number;
        desktop: string;
        mobile: string;
    } = $props();
</script>

<span class="device-specific-message" id="{panel}-message-{n}"><span class="desktop-message">{desktop}</span><span class="mobile-message">{mobile}</span></span>

<style>
    .mobile-message {
        display: none;
    }

    @media (max-width: 31.25rem) {
        .desktop-message {
            display: none;
        }

        .mobile-message {
            display: inline;
        }
    }
</style>
