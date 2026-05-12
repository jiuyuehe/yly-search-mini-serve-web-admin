import { Layout } from '@/utils/routerHelper'

const { t } = useI18n()
/**
 * redirect: noredirect        当设置 noredirect 的时候该路由在面包屑导航中不可被点击
 * name:'router-name'          设定路由的名字，一定要填写不然使用<keep-alive>时会出现各种问题
 * meta : {
 hidden: true              当设置 true 的时候该路由不会再侧边栏出现 如404，login等页面(默认 false)

 alwaysShow: true          当你一个路由下面的 children 声明的路由大于1个时，自动会变成嵌套的模式，
 只有一个时，会将那个子路由当做根路由显示在侧边栏，
 若你想不管路由下面的 children 声明的个数都显示你的根路由，
 你可以设置 alwaysShow: true，这样它就会忽略之前定义的规则，
 一直显示根路由(默认 false)

 title: 'title'            设置该路由在侧边栏和面包屑中展示的名字

 icon: 'svg-name'          设置该路由的图标

 noCache: true             如果设置为true，则不会被 <keep-alive> 缓存(默认 false)

 breadcrumb: false         如果设置为false，则不会在breadcrumb面包屑中显示(默认 true)

 affix: true               如果设置为true，则会一直固定在tag项中(默认 false)

 noTagsView: true          如果设置为true，则不会出现在tag中(默认 false)

 activeMenu: '/dashboard'  显示高亮的路由路径

 followAuth: '/dashboard'  跟随哪个路由进行权限过滤

 canTo: true               设置为true即使hidden为true，也依然可以进行路由跳转(默认 false)
 }
 **/
const remainingRouter: AppRouteRecordRaw[] = [
  {
    path: '/redirect',
    component: Layout,
    name: 'Redirect',
    children: [
      {
        path: '/redirect/:path(.*)',
        name: 'Redirect',
        component: () => import('@/views/Redirect/Redirect.vue'),
        meta: {}
      }
    ],
    meta: {
      hidden: true,
      noTagsView: true
    }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/index',
    name: 'Home',
    meta: {},
    children: [
      {
        path: 'index',
        component: () => import('@/views/Home/Index.vue'),
        name: 'Index',
        meta: {
          title: t('router.home'),
          icon: 'ep:home-filled',
          noCache: false,
          affix: true
        }
      }
    ]
  },
  {
    path: '/user',
    component: Layout,
    name: 'UserInfo',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'profile',
        component: () => import('@/views/Profile/Index.vue'),
        name: 'Profile',
        meta: {
          canTo: true,
          hidden: true,
          noTagsView: false,
          icon: 'ep:user',
          title: t('common.profile')
        }
      },
      {
        path: 'notify-message',
        component: () => import('@/views/system/notify/my/index.vue'),
        name: 'MyNotifyMessage',
        meta: {
          canTo: true,
          hidden: true,
          noTagsView: false,
          icon: 'ep:message',
          title: '我的站内信'
        }
      }
    ]
  },
  {
    path: '/dict',
    component: Layout,
    name: 'dict',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'type/data/:dictType',
        component: () => import('@/views/system/dict/data/index.vue'),
        name: 'SystemDictData',
        meta: {
          title: '字典数据',
          noCache: true,
          hidden: true,
          canTo: true,
          icon: '',
          activeMenu: '/system/dict'
        }
      }
    ]
  },

  {
    path: '/codegen',
    component: Layout,
    name: 'CodegenEdit',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'edit',
        component: () => import('@/views/infra/codegen/EditTable.vue'),
        name: 'InfraCodegenEditTable',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          icon: 'ep:edit',
          title: '修改生成配置',
          activeMenu: 'infra/codegen/index'
        }
      }
    ]
  },
  {
    path: '/job',
    component: Layout,
    name: 'JobL',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'job-log',
        component: () => import('@/views/infra/job/logger/index.vue'),
        name: 'InfraJobLog',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          icon: 'ep:edit',
          title: '调度日志',
          activeMenu: 'infra/job/index'
        }
      }
    ]
  },
  {
    path: '/login',
    component: () => import('@/views/Login/Login.vue'),
    name: 'Login',
    meta: {
      hidden: true,
      title: t('router.login'),
      noTagsView: true
    }
  },
  {
    path: '/sso',
    component: () => import('@/views/Login/Login.vue'),
    name: 'SSOLogin',
    meta: {
      hidden: true,
      title: t('router.login'),
      noTagsView: true
    }
  },
  {
    path: '/social-login',
    component: () => import('@/views/Login/SocialLogin.vue'),
    name: 'SocialLogin',
    meta: {
      hidden: true,
      title: t('router.socialLogin'),
      noTagsView: true
    }
  },
  {
    path: '/403',
    component: () => import('@/views/Error/403.vue'),
    name: 'NoAccess',
    meta: {
      hidden: true,
      title: '403',
      noTagsView: true
    }
  },
  {
    path: '/404',
    component: () => import('@/views/Error/404.vue'),
    name: 'NoFound',
    meta: {
      hidden: true,
      title: '404',
      noTagsView: true
    }
  },
  {
    path: '/500',
    component: () => import('@/views/Error/500.vue'),
    name: 'Error',
    meta: {
      hidden: true,
      title: '500',
      noTagsView: true
    }
  },
  {
    path: '/bpm',
    component: Layout,
    name: 'bpm',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'manager/form/edit',
        component: () => import('@/views/bpm/form/editor/index.vue'),
        name: 'BpmFormEditor',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '设计流程表单',
          activeMenu: '/bpm/manager/form'
        }
      },
      {
        path: 'manager/definition',
        component: () => import('@/views/bpm/model/definition/index.vue'),
        name: 'BpmProcessDefinition',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '流程定义',
          activeMenu: '/bpm/manager/model'
        }
      },
      {
        path: 'process-instance/detail',
        component: () => import('@/views/bpm/processInstance/detail/index.vue'),
        name: 'BpmProcessInstanceDetail',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '流程详情',
          activeMenu: '/bpm/task/my'
        },
        props: (route) => ({
          id: route.query.id,
          taskId: route.query.taskId,
          activityId: route.query.activityId
        })
      },
      {
        path: 'process-instance/report',
        component: () => import('@/views/bpm/processInstance/report/index.vue'),
        name: 'BpmProcessInstanceReport',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '数据报表',
          activeMenu: '/bpm/manager/model'
        }
      },
      {
        path: 'oa/leave/create',
        component: () => import('@/views/bpm/oa/leave/create.vue'),
        name: 'OALeaveCreate',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '发起 OA 请假',
          activeMenu: '/bpm/oa/leave'
        }
      },
      {
        path: 'oa/leave/detail',
        component: () => import('@/views/bpm/oa/leave/detail.vue'),
        name: 'OALeaveDetail',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '查看 OA 请假',
          activeMenu: '/bpm/oa/leave'
        }
      },
      {
        path: 'manager/model/create',
        component: () => import('@/views/bpm/model/form/index.vue'),
        name: 'BpmModelCreate',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '创建流程',
          activeMenu: '/bpm/manager/model'
        }
      },
      {
        path: 'manager/model/:type/:id',
        component: () => import('@/views/bpm/model/form/index.vue'),
        name: 'BpmModelUpdate',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '修改流程',
          activeMenu: '/bpm/manager/model'
        }
      }
    ]
  },

  {
    path: '/pay',
    component: Layout,
    name: 'pay',
    meta: { hidden: true },
    children: [
      {
        path: 'cashier',
        name: 'PayCashier',
        meta: {
          title: '收银台',
          noCache: true,
          hidden: true
        },
        component: () => import('@/views/pay/cashier/index.vue')
      }
    ]
  },

  {
    path: '/ai',
    component: Layout,
    name: 'Ai',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'image/square',
        component: () => import('@/views/ai/image/square/index.vue'),
        name: 'AiImageSquare',
        meta: {
          title: '绘图作品',
          icon: 'ep:home-filled',
          noCache: false
        }
      },
      {
        path: 'knowledge/document',
        component: () => import('@/views/ai/knowledge/document/index.vue'),
        name: 'AiKnowledgeDocument',
        meta: {
          title: '知识库文档',
          icon: 'ep:document',
          noCache: false,
          activeMenu: '/ai/knowledge'
        }
      },
      {
        path: 'knowledge/document/create',
        component: () => import('@/views/ai/knowledge/document/form/index.vue'),
        name: 'AiKnowledgeDocumentCreate',
        meta: {
          title: '创建文档',
          icon: 'ep:plus',
          noCache: true,
          hidden: true,
          activeMenu: '/ai/knowledge'
        }
      },
      {
        path: 'knowledge/document/update',
        component: () => import('@/views/ai/knowledge/document/form/index.vue'),
        name: 'AiKnowledgeDocumentUpdate',
        meta: {
          title: '修改文档',
          icon: 'ep:edit',
          noCache: true,
          hidden: true,
          activeMenu: '/ai/knowledge'
        }
      },
      {
        path: 'knowledge/retrieval',
        component: () => import('@/views/ai/knowledge/knowledge/retrieval/index.vue'),
        name: 'AiKnowledgeRetrieval',
        meta: {
          title: '文档召回测试',
          icon: 'ep:search',
          noCache: true,
          hidden: true,
          activeMenu: '/ai/knowledge'
        }
      },
      {
        path: 'knowledge/segment',
        component: () => import('@/views/ai/knowledge/segment/index.vue'),
        name: 'AiKnowledgeSegment',
        meta: {
          title: '知识库分段',
          icon: 'ep:tickets',
          noCache: true,
          hidden: true,
          activeMenu: '/ai/knowledge'
        }
      },
      {
        path: 'console/workflow/create',
        component: () => import('@/views/ai/workflow/form/index.vue'),
        name: 'AiWorkflowCreate',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '设计 AI 工作流',
          activeMenu: '/ai/console/workflow'
        }
      },
      {
        path: 'console/workflow/:type/:id',
        component: () => import('@/views/ai/workflow/form/index.vue'),
        name: 'AiWorkflowUpdate',
        meta: {
          noCache: true,
          hidden: true,
          canTo: true,
          title: '设计 AI 工作流',
          activeMenu: '/ai/console/workflow'
        }
      }
    ]
  },
  {
    path: '/data-catalog',
    component: Layout,
    name: 'DataCatalogCompat',
    redirect: '/data-catalog/taxonomy/dashboard',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'taxonomy',
        component: () => import('@/views/data-catalog/taxonomy/index.vue'),
        name: 'DataCatalogTaxonomyCompat',
        meta: { title: '主题标签库', canTo: true, hidden: true }
      },
      {
        path: 'taxonomy/dashboard',
        component: () => import('@/views/data-catalog/taxonomy/dashboard/index.vue'),
        name: 'DataCatalogTaxonomyDashboardCompat',
        meta: { title: '分类分级看板', canTo: true, hidden: true }
      },
      {
        path: 'taxonomy/themes',
        component: () => import('@/views/data-catalog/taxonomy/themes/index.vue'),
        name: 'DataCatalogTaxonomyThemesCompat',
        meta: { title: '一级主题定义', canTo: true, hidden: true }
      },
      {
        path: 'taxonomy/levels',
        component: () => import('@/views/data-catalog/taxonomy/levels/index.vue'),
        name: 'DataCatalogTaxonomyLevelsCompat',
        meta: { title: '二级主题定义', canTo: true, hidden: true }
      },
      {
        path: 'taxonomy/tools',
        component: () => import('@/views/data-catalog/taxonomy/tools/index.vue'),
        name: 'DataCatalogTaxonomyToolsCompat',
        meta: { title: '主题 Tools 与 MCP', canTo: true, hidden: true }
      },
      {
        path: 'metadata',
        component: () => import('@/views/data-catalog/metadata/index.vue'),
        name: 'DataCatalogMetadataCompat',
        meta: { title: '元数据数据建模', canTo: true, hidden: true }
      },
      {
        path: 'metadata/templates',
        component: () => import('@/views/data-catalog/metadata/templates/index.vue'),
        name: 'DataCatalogMetadataTemplatesCompat',
        meta: { title: '模板市场管理', canTo: true, hidden: true }
      },
      {
        path: 'metadata/models',
        component: () => import('@/views/data-catalog/metadata/models/index.vue'),
        name: 'DataCatalogMetadataModelsCompat',
        meta: { title: '数据模型列表', canTo: true, hidden: true }
      },
      {
        path: 'metadata/models/detail',
        component: () => import('@/views/data-catalog/metadata/models/detail/index.vue'),
        name: 'DataCatalogMetadataModelDetailCompat',
        meta: { title: '数据模型详情', canTo: true, hidden: true, activeMenu: '/data-catalog/metadata/models' }
      },
      {
        path: 'metadata/builtin',
        component: () => import('@/views/data-catalog/metadata/builtin/index.vue'),
        name: 'DataCatalogMetadataBuiltinCompat',
        meta: { title: '内置模型', canTo: true, hidden: true }
      },
      {
        path: 'metadata/tools',
        component: () => import('@/views/data-catalog/metadata/tools/index.vue'),
        name: 'DataCatalogMetadataToolsCompat',
        meta: { title: '模型 Tools 与 MCP', canTo: true, hidden: true }
      },
      {
        path: 'graph',
        component: () => import('@/views/data-catalog/graph/index.vue'),
        name: 'DataCatalogGraphCompat',
        meta: { title: '数据图谱', canTo: true, hidden: true }
      },
      {
        path: 'graph/ner',
        component: () => import('@/views/data-catalog/graph/ner/index.vue'),
        name: 'DataCatalogGraphNerCompat',
        meta: { title: 'NER 图谱', canTo: true, hidden: true }
      },
      {
        path: 'graph/mail',
        component: () => import('@/views/data-catalog/graph/mail/index.vue'),
        name: 'DataCatalogGraphMailCompat',
        meta: { title: '邮件分析图谱', canTo: true, hidden: true }
      },
      {
        path: 'graph/person',
        component: () => import('@/views/data-catalog/graph/person/index.vue'),
        name: 'DataCatalogGraphPersonCompat',
        meta: { title: '人物画像图谱', canTo: true, hidden: true }
      }
    ]
  },
  {
    path: '/data-governance-dashboard',
    component: Layout,
    name: 'DataGovernanceDashboardRootCompat',
    redirect: '/data-governance-dashboard/base',
    meta: {
      hidden: true
    },
    children: [
      {
        path: '',
        component: () => import('@/views/data-governance-dashboard/index.vue'),
        name: 'DataGovernanceDashboardIndexCompat',
        meta: { title: '数据治理看板', canTo: true, hidden: true }
      },
      {
        path: 'base',
        component: () => import('@/views/data-governance-dashboard/base/index.vue'),
        name: 'DataGovernanceDashboardBaseCompat',
        meta: { title: '基础数据看板', canTo: true, hidden: true }
      },
      {
        path: 'ai-task',
        component: () => import('@/views/data-governance-dashboard/ai-task/index.vue'),
        name: 'DataGovernanceDashboardAiTaskCompat',
        meta: { title: 'AI 任务看板', canTo: true, hidden: true }
      },
      {
        path: 'schedule',
        component: () => import('@/views/data-governance-dashboard/schedule/index.vue'),
        name: 'DataGovernanceDashboardScheduleCompat',
        meta: { title: '定时治理看板', canTo: true, hidden: true }
      },
      {
        path: 'search',
        component: () => import('@/views/data-governance-dashboard/search/index.vue'),
        name: 'DataGovernanceDashboardSearchCompat',
        meta: { title: '搜索日志看板', canTo: true, hidden: true }
      },
      {
        path: 'tool-call',
        component: () => import('@/views/data-governance-dashboard/tool-call/index.vue'),
        name: 'DataGovernanceDashboardToolCallCompat',
        meta: { title: 'MCP 与 Tool 调用日志', canTo: true, hidden: true }
      }
    ]
  },
  {
    path: '/ai-data-governance',
    component: Layout,
    name: 'AiDataGovernanceCompat',
    redirect: '/ai-data-governance/rules',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'rules',
        component: () => import('@/views/ai-data-governance/rules/index.vue'),
        name: 'AiDataGovernanceRulesCompat',
        meta: { title: '治理规则管理', canTo: true, hidden: true }
      },
      {
        path: 'tools',
        component: () => import('@/views/ai-data-governance/tools/index.vue'),
        name: 'AiDataGovernanceToolsCompat',
        meta: { title: '全系统 Tool 与 MCP', canTo: true, hidden: true }
      },
      {
        path: 'basic-schedule',
        component: () => import('@/views/ai-data-governance/basic-schedule/index.vue'),
        name: 'AiDataGovernanceBasicScheduleCompat',
        meta: { title: 'AI 基础定时管理', canTo: true, hidden: true }
      },
      {
        path: 'agent-schedule',
        component: () => import('@/views/ai-data-governance/agent-schedule/index.vue'),
        name: 'AiDataGovernanceAgentScheduleCompat',
        meta: { title: 'AI 治理任务定时管理', canTo: true, hidden: true }
      },
      {
        path: 'fill-dashboard',
        component: () => import('@/views/ai-data-governance/fill-dashboard/index.vue'),
        name: 'AiDataGovernanceFillDashboardCompat',
        meta: { title: '数据填充看板', canTo: true, hidden: true }
      },
      {
        path: 'audio-asr',
        component: () => import('@/views/ai-data-governance/audio-asr/index.vue'),
        name: 'AiDataGovernanceAudioAsrCompat',
        meta: { title: '音视频智能转写', canTo: true, hidden: true }
      }
    ]
  },
  {
    path: '/data-governance',
    component: Layout,
    name: 'DataGovernanceCompat',
    redirect: '/data-governance-dashboard/base',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/data-governance-dashboard/index.vue'),
        name: 'DataGovernanceDashboardCompat',
        meta: { title: '数据治理看板', canTo: true, hidden: true }
      },
      {
        path: 'dashboard/taxonomy',
        component: () => import('@/views/data-catalog/taxonomy/dashboard/index.vue'),
        name: 'DataGovernanceDashboardTaxonomyCompat',
        meta: { title: '分类分级看板', canTo: true, hidden: true }
      },
      {
        path: 'dashboard/metadata-fill',
        component: () => import('@/views/ai-data-governance/fill-dashboard/index.vue'),
        name: 'DataGovernanceDashboardMetadataFillCompat',
        meta: { title: '数据填充看板', canTo: true, hidden: true }
      },
      {
        path: 'governance/tool-log',
        component: () => import('@/views/ai-data-governance/tools/index.vue'),
        name: 'DataGovernanceToolLogCompat',
        meta: { title: 'Tool 能力与调用日志', canTo: true, hidden: true }
      },
      {
        path: 'graph',
        component: () => import('@/views/data-catalog/graph/index.vue'),
        name: 'DataGovernanceGraphCompat',
        meta: { title: '图谱分析', canTo: true, hidden: true }
      },
      {
        path: 'graph/ner',
        component: () => import('@/views/data-catalog/graph/ner/index.vue'),
        name: 'DataGovernanceGraphNerCompat',
        meta: { title: 'NER 图谱', canTo: true, hidden: true }
      },
      {
        path: 'graph/mail',
        component: () => import('@/views/data-catalog/graph/mail/index.vue'),
        name: 'DataGovernanceGraphMailCompat',
        meta: { title: '邮件图谱', canTo: true, hidden: true }
      },
      {
        path: 'graph/person-profile',
        component: () => import('@/views/data-catalog/graph/person/index.vue'),
        name: 'DataGovernancePersonProfileCompat',
        meta: { title: '人物画像', canTo: true, hidden: true }
      }
    ]
  },
  {
    path: '/rag/dashboard',
    component: Layout,
    name: 'RagDashboardCompat',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'taxonomy',
        component: () => import('@/views/data-catalog/taxonomy/dashboard/index.vue'),
        name: 'RagDashboardTaxonomyCompat',
        meta: { title: '分类分级看板', canTo: true, hidden: true, activeMenu: '/data-catalog/taxonomy/dashboard' }
      },
      {
        path: 'metadata-fill',
        component: () => import('@/views/ai-data-governance/fill-dashboard/index.vue'),
        name: 'RagDashboardMetadataFillCompat',
        meta: { title: '数据填充看板', canTo: true, hidden: true, activeMenu: '/ai-data-governance/fill-dashboard' }
      }
    ]
  },
  {
    path: '/rag/governance',
    component: Layout,
    name: 'RagGovernanceCompat',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'tool-log',
        component: () => import('@/views/ai-data-governance/tools/index.vue'),
        name: 'RagGovernanceToolLogCompat',
        meta: { title: 'Tool 能力与调用日志', canTo: true, hidden: true, activeMenu: '/ai-data-governance/tools' }
      }
    ]
  },
  {
    path: '/rag/graph',
    component: Layout,
    name: 'RagGraphCompat',
    meta: {
      hidden: true
    },
    children: [
      {
        path: 'ner',
        component: () => import('@/views/data-catalog/graph/ner/index.vue'),
        name: 'RagGraphNerCompat',
        meta: { title: 'NER 图谱', canTo: true, hidden: true, activeMenu: '/data-catalog/graph/ner' }
      },
      {
        path: 'mail',
        component: () => import('@/views/data-catalog/graph/mail/index.vue'),
        name: 'RagGraphMailCompat',
        meta: { title: '邮件图谱', canTo: true, hidden: true, activeMenu: '/data-catalog/graph/mail' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/Error/404.vue'),
    name: '',
    meta: {
      title: '404',
      hidden: true,
      breadcrumb: false
    }
  },

]

export default remainingRouter
