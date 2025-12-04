import { _supabase } from '../supabaseClient.js';
import { carregarClientes } from './crm.js';
import { loadPermissions } from './permissions.js';
import { showToast } from './ui.js';

let systemChannel = null;
let dataChannel = null;

export async function initRealtime() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    const { data: perfil } = await _supabase
        .from('perfis')
        .select('loja_id')
        .eq('user_id', user.id)
        .single();

    if (!perfil || !perfil.loja_id) return;

    const lojaId = perfil.loja_id;
    console.log("Iniciando Realtime para Loja:", lojaId);

    if (systemChannel) _supabase.removeChannel(systemChannel);
    if (dataChannel) _supabase.removeChannel(dataChannel);

    systemChannel = _supabase.channel('canal-sistema')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'clientes', filter: `loja_id=eq.${lojaId}` },
            (payload) => {
                console.log('Realtime: Clientes atualizado');
                carregarClientes(); 
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'perfis', filter: `user_id=eq.${user.id}` },
            async () => {
                console.log('Realtime: Permissões alteradas');
                showToast('Suas permissões foram alteradas.', 'warning');
                await loadPermissions(); 
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'loja_roles', filter: `loja_id=eq.${lojaId}` },
            async () => {
                console.log('Realtime: Cargos alterados');
                await loadPermissions();
            }
        )
        .subscribe();
    dataChannel = _supabase.channel('canal-dados');

    const tabelasDados = [
        'tecidos', 'confeccao', 'trilho', 'frete', 'instalacao',
        'amorim_modelos_cortina', 'amorim_cores_cortina',
        'amorim_modelos_toldo', 'amorim_cores_toldo'
    ];

    tabelasDados.forEach(tabela => {
        dataChannel.on(
            'postgres_changes',
            { 
                event: '*', 
                schema: 'public', 
                table: tabela, 
                filter: `loja_id=eq.${lojaId}` 
            },
            (payload) => {
                console.log(`Realtime: ${tabela} alterada.`);
                document.dispatchEvent(new CustomEvent('dadosBaseAlterados'));
            }
        );
    });

    dataChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('Realtime Dados: Conectado!');
    });
}