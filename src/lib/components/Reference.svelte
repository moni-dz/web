<script lang="ts">
    let { n, kind }: { n: number; kind: 'ref' | 'back' } = $props();

    const id = $derived(kind === 'ref' ? `ref-${n}` : `back-ref-${n}`);
    const target = $derived(kind === 'ref' ? `back-ref-${n}` : `ref-${n}`);
    const label = $derived(kind === 'ref' ? `Open reference ${n}` : `Return to reference ${n}`);
</script>

<sup {id}><a href="#{target}" aria-label={label}>{n}</a></sup>
