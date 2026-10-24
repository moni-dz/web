<script lang="ts">
    let {
        panel,
        n,
        desktop,
        mobile,
    }: {
        panel: string;
        n: number;
        desktop: string;
        mobile: string;
    } = $props();
</script>

<span class="device-specific-message" id="{panel}-message-{n}"
    ><span class="desktop-message max-sm:hidden">{desktop}</span><span class="mobile-message hidden max-sm:inline"
        >{mobile}</span
    ></span
>
