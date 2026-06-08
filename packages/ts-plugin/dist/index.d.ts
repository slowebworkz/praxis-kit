import tsserverlibrary from 'typescript/lib/tsserverlibrary';

type TS = typeof tsserverlibrary;
declare function init(modules: {
    typescript: TS;
}): {
    create: (info: tsserverlibrary.server.PluginCreateInfo) => tsserverlibrary.LanguageService;
};

export { init as default };
